import React, { useState, useEffect, useRef } from "react";
import { auth, db, loginWithGoogle, logout } from "../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  limit,
  where,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "../lib/cloudinary";
import {
  Image as ImageIcon,
  Send,
  MessageSquare,
  ThumbsUp,
  Sparkles,
  User,
  LogOut,
  Camera,
  Share2,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  ShieldCheck,
  Search,
  RefreshCw,
  Copy,
  Check,
  Bot,
  MessageCircle,
  AlertTriangle,
  Lightbulb,
  Type,
  Eye,
  Heart,
  Plus,
  History,
  ChevronRight,
  Lock,
  Pencil,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileText,
  Download,
  File,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";

interface AttachedFile {
  url: string;
  name: string;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  attachedFiles?: AttachedFile[];
  likes: string[];
  replies?: Comment[];
  createdAt: any;
  aiVerified?: boolean;
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  attachedFiles?: AttachedFile[];
  likes: string[];
  comments: Comment[];
  createdAt: any;
  aiVerified?: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

interface CommunityProps {
  externalSearchQuery?: string;
  onClearSearch?: () => void;
}

export function Community({
  externalSearchQuery = "",
  onClearSearch,
}: CommunityProps) {
  const [user, loading] = useAuthState(auth);

  // =========================================================
  // COMMUNITY GEMINI API
  // All Community AI features use one Vercel endpoint.
  // =========================================================
  const COMMUNITY_API = "/api/gemini/community";

  type CommunityChatResponse = {
    text?: string;
    error?: string;
  };

  type CommunityModerationResponse = {
    approved?: boolean;
    reason?: string;
    error?: string;
  };

  type CommunitySearchResponse = {
    matchingIds?: string[];
    analysis?: string;
    error?: string;
  };

  const callCommunityApi = async <T,>(
    action: "chat" | "moderate" | "search-posts",
    payload: Record<string, unknown>,
  ): Promise<T> => {
    const response = await fetch(COMMUNITY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Community API lỗi ${response.status}`);
    }

    return data as T;
  };

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<"feed" | "ai-chat">("feed");

  // Data States
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  // Feed Post Creation States
  const [newPostContent, setNewPostContent] = useState("");
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Comment & Reply Visibility State
  const [expandedComments, setExpandedComments] = useState<{
    [postId: string]: boolean;
  }>({});
  const [collapsedReplies, setCollapsedReplies] = useState<{
    [commentId: string]: boolean;
  }>({});
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [commentImages, setCommentImages] = useState<{
    [postId: string]: File[];
  }>({});
  const [commentFiles, setCommentFiles] = useState<{
    [postId: string]: File[];
  }>({});
  const [replyingTo, setReplyingTo] = useState<{
    postId: string;
    commentId: string;
    replyToName?: string;
  } | null>(null);

  // Moderation Warning Modal
  const [moderationWarning, setModerationWarning] = useState<{
    open: boolean;
    reason: string;
  }>({ open: false, reason: "" });
  const [isModerating, setIsModerating] = useState(false);

  // Custom Confirmation Modal State for Deletions & Recalls
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    confirmText: "Xác nhận",
    onConfirm: () => {},
  });

  // Toast Notice State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Edit Post State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editPostImages, setEditPostImages] = useState<string[]>([]);
  const [editPostAttachedFiles, setEditPostAttachedFiles] = useState<
    AttachedFile[]
  >([]);
  const [editNewPostImages, setEditNewPostImages] = useState<File[]>([]);
  const [editNewPostFiles, setEditNewPostFiles] = useState<File[]>([]);

  // Detailed Post Popup State
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const handleClosePostDetail = () => {
    setSelectedPostId(null);
    setSelectedPost(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    url.hash = "";
    window.history.pushState({}, "", url.toString());
  };

  // Edit Comment State
  const [editingComment, setEditingComment] = useState<{
    postId: string;
    commentId: string;
    parentCommentId?: string;
    isReply: boolean;
    content: string;
    imageUrls?: string[];
    attachedFiles?: AttachedFile[];
    newImages?: File[];
    newFiles?: File[];
  } | null>(null);

  const isImageUrl = (url: string) => {
    if (!url) return false;
    const clean = url.toLowerCase().split("?")[0];
    if (clean.startsWith("data:image/") || clean.startsWith("blob:"))
      return true;
    return (
      /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(clean) ||
      url.includes("/image/upload/")
    );
  };

  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (!name) return "";
    if (name.length <= maxLength) return name;
    const extIndex = name.lastIndexOf(".");
    if (extIndex !== -1 && name.length - extIndex <= 6) {
      const ext = name.substring(extIndex);
      const base = name.substring(0, extIndex);
      const allowedLength = maxLength - ext.length - 4;
      if (allowedLength > 0) {
        return base.substring(0, allowedLength) + "...." + ext;
      }
    }
    return name.substring(0, maxLength - 4) + "....";
  };

  const handleFileDownload = async (
    url: string,
    filename: string,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Direct download failed, opening in new tab:", err);
      window.open(url, "_blank");
    }
  };

  const renderTextWithLinks = (text: string) => {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith("www.") ? `https://${part}` : part;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all font-semibold transition inline-block"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const renderFileAttachment = (file: AttachedFile) => {
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 flex items-center gap-3 p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl transition group w-fit max-w-full shadow-sm"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-bold text-slate-100 group-hover:text-teal-400 transition truncate"
            title={file.name}
          >
            {truncateFileName(file.name, 25)}
          </p>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Download size={11} className="text-teal-400" />
            <span>Tải / Xem tệp đính kèm</span>
          </span>
        </div>
      </a>
    );
  };

  const renderPostAttachments = (post: Post) => {
    const images =
      post.imageUrls ||
      (post.imageUrl && isImageUrl(post.imageUrl) ? [post.imageUrl] : []);
    const files: AttachedFile[] = post.attachedFiles || [];

    // Backwards compatibility for single document file in old post.imageUrl
    if (post.imageUrl && !isImageUrl(post.imageUrl)) {
      const filename =
        post.imageUrl.split("/").pop()?.split("?")[0] ||
        "Tệp đính kèm tài liệu";
      if (!files.some((f) => f.url === post.imageUrl)) {
        files.push({ url: post.imageUrl, name: filename });
      }
    }

    return (
      <div className="space-y-2 mt-2">
        {images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {images.map((url, idx) => (
              <div
                key={idx}
                className="rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-950/20 shadow-sm max-w-full relative group"
              >
                <img
                  src={url}
                  alt={`attachment-${idx}`}
                  className="w-full h-auto object-contain max-h-[600px] rounded-2xl cursor-pointer hover:opacity-95 transition"
                  onClick={() => window.open(url, "_blank")}
                />
              </div>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, idx) => (
              <div key={idx}>{renderFileAttachment(file)}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCommentAttachments = (c: Comment) => {
    const images =
      c.imageUrls || (c.imageUrl && isImageUrl(c.imageUrl) ? [c.imageUrl] : []);
    const files: AttachedFile[] = c.attachedFiles || [];

    // Backwards compatibility for single document file in old comment.imageUrl
    if (c.imageUrl && !isImageUrl(c.imageUrl)) {
      const filename =
        c.imageUrl.split("/").pop()?.split("?")[0] || "Tệp đính kèm";
      if (!files.some((f) => f.url === c.imageUrl)) {
        files.push({ url: c.imageUrl, name: filename });
      }
    }

    return (
      <div className="space-y-1.5 mt-1.5">
        {images.length > 0 && (
          <div className="grid grid-cols-1 gap-1.5 max-w-[260px] sm:max-w-[320px]">
            {images.map((url, idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden border border-slate-700/40 bg-slate-950/20 shadow-sm relative group"
              >
                <img
                  src={url}
                  alt={`comment-attachment-${idx}`}
                  className="w-full h-auto object-contain max-h-[300px] rounded-xl cursor-pointer hover:opacity-95 transition"
                  onClick={() => window.open(url, "_blank")}
                />
              </div>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="flex flex-col gap-1 max-w-[260px] sm:max-w-[320px]">
            {files.map((file, idx) => (
              <a
                key={idx}
                href={file.url}
                onClick={(e) => handleFileDownload(file.url, file.name, e)}
                className="flex items-center gap-2 p-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition group w-fit max-w-full shadow-sm text-[10px]"
              >
                <FileText size={12} className="text-teal-400 shrink-0" />
                <span
                  className="text-slate-200 group-hover:text-teal-400 transition truncate max-w-[150px] sm:max-w-[200px]"
                  title={file.name}
                >
                  {truncateFileName(file.name, 18)}
                </span>
                <Download size={10} className="text-teal-400 shrink-0 ml-1" />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAttachment = (url?: string) => {
    if (!url) return null;
    if (isImageUrl(url)) {
      return (
        <div className="mt-2.5 rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-950/20 shadow-sm max-w-full">
          <img
            src={url}
            alt="attachment"
            className="w-full h-auto object-contain max-h-[600px] rounded-2xl cursor-pointer hover:opacity-95 transition"
            onClick={() => window.open(url, "_blank")}
          />
        </div>
      );
    }

    const filename = url.split("/").pop()?.split("?")[0] || "Tệp đính kèm";
    return (
      <a
        href={url}
        onClick={(e) => handleFileDownload(url, filename, e)}
        className="mt-2.5 flex items-center gap-3 p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl transition group w-fit max-w-full shadow-sm"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-bold text-slate-100 group-hover:text-teal-400 transition truncate"
            title={filename}
          >
            {truncateFileName(filename, 25)}
          </p>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Download size={11} className="text-teal-400" />
            <span>Tải / Xem tệp đính kèm</span>
          </span>
        </div>
      </a>
    );
  };

  // AI Search & Topic Analysis
  const [aiSearchAnalysis, setAiSearchAnalysis] = useState<string>("");
  const [aiSearchMatchingIds, setAiSearchMatchingIds] = useState<
    string[] | null
  >(null);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Gemini Chatbot States with Sessions & History
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem("chem_dex_ai_sessions");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse chat sessions", e);
    }
    return [
      {
        id: "default-session",
        title: "Hỏi đáp Hóa Học 1",
        createdAt: new Date().toLocaleDateString("vi-VN"),
        messages: [
          {
            id: "welcome-1",
            role: "model",
            content:
              "Xin chào! Tôi là **Trợ lý AI Hóa Học ChemDex**. Bạn có thắc mắc gì về bài tập, cơ chế phản ứng, cân bằng phương trình hay công thức hóa học? Hãy hỏi tôi ngay bên dưới nhé!\n\n*Hỗ trợ định dạng LaTeX ($H_2SO_4$, $$\\text{Fe} + 2\\text{HCl} \\rightarrow \\text{FeCl}_2 + \\text{H}_2\\uparrow$$) và bảng so sánh Markdown.*",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => chatSessions[0]?.id || "default-session",
  );
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Current Active Chat Messages
  const activeSession =
    chatSessions.find((s) => s.id === activeSessionId) || chatSessions[0];
  const chatMessages = activeSession ? activeSession.messages : [];

  // Sync Chat Sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "chem_dex_ai_sessions",
        JSON.stringify(chatSessions),
      );
    } catch (e) {
      console.error("Failed to save chat sessions", e);
    }
  }, [chatSessions]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    setIsLoadingPosts(true);
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(30),
    );
    const unsubscribePosts = onSnapshot(
      q,
      (snapshot) => {
        const postsData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Post,
        );
        setPosts(postsData);
        setIsLoadingPosts(false);
      },
      (err) => {
        console.error("Firestore Posts Error:", err);
        setIsLoadingPosts(false);
      },
    );

    return () => {
      unsubscribePosts();
    };
  }, []);

  // Handle AI Search when external query changes
  useEffect(() => {
    // Prevent accidental DOM/Event objects from being sent to JSON.stringify.
    const queryText =
      typeof externalSearchQuery === "string" ? externalSearchQuery.trim() : "";

    if (!queryText) {
      setAiSearchAnalysis("");
      setAiSearchMatchingIds(null);
      return;
    }

    const performAiSearch = async () => {
      setIsAiSearching(true);
      try {
        const data = await callCommunityApi<CommunitySearchResponse>(
          "search-posts",
          {
            query: queryText,
            posts: posts.map((post) => ({
              id: post.id,
              content: post.content,
              authorName: post.authorName,
            })),
          },
        );
        setAiSearchMatchingIds(data.matchingIds || []);
        setAiSearchAnalysis(data.analysis || "Tìm thấy bài viết liên quan");
      } catch (e) {
        console.error("AI Search Failed:", e);
      }
      setIsAiSearching(false);
    };

    const timer = setTimeout(() => {
      if (posts.length > 0) performAiSearch();
    }, 400);

    return () => clearTimeout(timer);
  }, [externalSearchQuery, posts]);

  // Check URL query parameters or hash for 'post' to open details popup
  useEffect(() => {
    const handleUrlCheck = () => {
      const params = new URLSearchParams(window.location.search);
      let postId = params.get("post");

      if (!postId && window.location.hash) {
        const hash = window.location.hash;
        if (hash.startsWith("#post-")) {
          postId = hash.substring(6);
        } else if (hash.startsWith("#post=")) {
          postId = hash.substring(6);
        }
      }

      if (postId) {
        setSelectedPostId(postId);
      }
    };

    handleUrlCheck();

    window.addEventListener("popstate", handleUrlCheck);
    window.addEventListener("hashchange", handleUrlCheck);
    return () => {
      window.removeEventListener("popstate", handleUrlCheck);
      window.removeEventListener("hashchange", handleUrlCheck);
    };
  }, []);

  // Subscribe to real-time updates for the selected post
  useEffect(() => {
    if (!selectedPostId) {
      setSelectedPost(null);
      return;
    }

    const docRef = doc(db, "posts", selectedPostId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSelectedPost({ id: docSnap.id, ...docSnap.data() } as Post);
        } else {
          console.log("No such post exists!");
          setSelectedPost(null);
        }
      },
      (error) => {
        console.error("Error getting post details:", error);
      },
    );

    return () => unsubscribe();
  }, [selectedPostId]);

  // Auto-expand comments for the selected post
  useEffect(() => {
    if (selectedPostId) {
      setExpandedComments((prev) => ({
        ...prev,
        [selectedPostId]: true,
      }));
    }
  }, [selectedPostId]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === "ai-chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Create Post with AI Moderation
  const handleCreatePost = async () => {
    if (
      !user ||
      (!newPostContent.trim() &&
        postImages.length === 0 &&
        postFiles.length === 0)
    )
      return;

    setIsModerating(true);
    try {
      const modData = await callCommunityApi<CommunityModerationResponse>(
        "moderate",
        {
          text: newPostContent,
          type: "post",
        },
      );

      if (!modData.approved) {
        setIsModerating(false);
        setModerationWarning({
          open: true,
          reason:
            modData.reason ||
            "Nội dung chứa từ ngữ không phù hợp hoặc vi phạm quy tắc diễn đàn.",
        });
        return;
      }
    } catch (e) {
      console.warn("Moderation check skipped due to error", e);
    }
    setIsModerating(false);

    setIsUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const img of postImages) {
        const url = await uploadFileToCloudinary(img);
        imageUrls.push(url);
      }

      const attachedFiles: AttachedFile[] = [];
      for (const f of postFiles) {
        const url = await uploadFileToCloudinary(f);
        attachedFiles.push({ url, name: f.name });
      }

      await addDoc(collection(db, "posts"), {
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhoto: user.photoURL || "",
        content: newPostContent,
        imageUrls,
        attachedFiles,
        likes: [],
        comments: [],
        aiVerified: true,
        createdAt: serverTimestamp(),
      });

      setNewPostContent("");
      setPostImages([]);
      setPostFiles([]);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi đăng bài viết. Vui lòng thử lại!");
    }
    setIsUploading(false);
  };

  // Like Post
  const handleLike = async (postId: string, likes: string[]) => {
    if (!user) return alert("Vui lòng đăng nhập để tương tác!");
    const postRef = doc(db, "posts", postId);
    if (likes.includes(user.uid)) {
      await updateDoc(postRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user.uid) });
    }
  };

  // Comment on Post with AI Moderation
  const handleComment = async (postId: string) => {
    if (!user) return alert("Vui lòng đăng nhập để bình luận!");
    const text = commentText[postId]?.trim();
    const cImages = commentImages[postId] || [];
    const cFiles = commentFiles[postId] || [];
    if (!text && cImages.length === 0 && cFiles.length === 0) return;

    if (text) {
      setIsModerating(true);
      try {
        const modData = await callCommunityApi<CommunityModerationResponse>(
          "moderate",
          {
            text,
            type: "comment",
          },
        );
        if (!modData.approved) {
          setIsModerating(false);
          setModerationWarning({
            open: true,
            reason: modData.reason || "Bình luận chứa từ ngữ không phù hợp.",
          });
          return;
        }
      } catch (e) {
        console.warn(e);
      }
      setIsModerating(false);
    }

    setIsUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const img of cImages) {
        const url = await uploadFileToCloudinary(img);
        imageUrls.push(url);
      }

      const attachedFiles: AttachedFile[] = [];
      for (const f of cFiles) {
        const url = await uploadFileToCloudinary(f);
        attachedFiles.push({ url, name: f.name });
      }

      let commentContent = text || "";
      if (
        replyingTo &&
        replyingTo.replyToName &&
        !commentContent.startsWith(`@${replyingTo.replyToName}`)
      ) {
        commentContent = `@${replyingTo.replyToName} ${commentContent}`;
      }

      const postRef = doc(db, "posts", postId);
      const newComment: Comment = {
        id: Date.now().toString(),
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhoto: user.photoURL || "",
        content: commentContent,
        imageUrls,
        attachedFiles,
        likes: [],
        replies: [],
        aiVerified: true,
        createdAt: new Date().toISOString(),
      };

      if (replyingTo && replyingTo.postId === postId) {
        const post = posts.find((p) => p.id === postId);
        if (post) {
          const parentComment = post.comments.find(
            (c) => c.id === replyingTo.commentId,
          );
          const updatedComments = post.comments.map((c) => {
            if (c.id === replyingTo.commentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
              };
            }
            return c;
          });
          await updateDoc(postRef, { comments: updatedComments });

          if (
            parentComment &&
            parentComment.authorId &&
            parentComment.authorId !== user.uid
          ) {
            try {
              await addDoc(collection(db, "notifications"), {
                recipientId: parentComment.authorId,
                senderId: user.uid,
                senderName: user.displayName || "Anonymous",
                senderPhoto: user.photoURL || "",
                postId,
                type: "reply",
                title: "Phản hồi mới",
                message: `${user.displayName || "Ai đó"} đã phản hồi bình luận của bạn.`,
                read: false,
                createdAt: serverTimestamp(),
              });
            } catch (err) {
              console.error("Failed to write reply notification:", err);
            }
          }
        }
        setReplyingTo(null);
      } else {
        await updateDoc(postRef, {
          comments: arrayUnion(newComment),
        });
        const post = posts.find((p) => p.id === postId);
        if (post && post.authorId && post.authorId !== user.uid) {
          try {
            await addDoc(collection(db, "notifications"), {
              recipientId: post.authorId,
              senderId: user.uid,
              senderName: user.displayName || "Anonymous",
              senderPhoto: user.photoURL || "",
              postId,
              type: "comment",
              title: "Bình luận mới",
              message: `${user.displayName || "Ai đó"} đã bình luận về bài viết của bạn.`,
              read: false,
              createdAt: serverTimestamp(),
            });
          } catch (err) {
            console.error("Failed to write comment notification:", err);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsUploading(false);

    setCommentText((prev) => ({ ...prev, [postId]: "" }));
    setCommentImages((prev) => ({ ...prev, [postId]: [] }));
    setCommentFiles((prev) => ({ ...prev, [postId]: [] }));
  };

  // Toggle Comment Box Expand
  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Delete / Recall Comment or Reply
  const handleDeleteComment = (
    postId: string,
    commentId: string,
    isReply: boolean = false,
    parentCommentId?: string,
  ) => {
    if (!user) return showToast("Vui lòng đăng nhập!");

    setConfirmModal({
      open: true,
      title: isReply ? "Thu Hồi Phản Hồi" : "Thu Hồi Bình Luận",
      message: `Bạn có chắc chắn muốn thu hồi ${isReply ? "phản hồi" : "bình luận"} này? Nội dung sẽ bị gỡ bỏ vĩnh viễn.`,
      confirmText: "Thu Hồi",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        let updatedComments = [...post.comments];
        if (isReply && parentCommentId) {
          updatedComments = updatedComments.map((c) => {
            if (c.id === parentCommentId) {
              const updatedReplies = (c.replies || []).filter(
                (r) => r.id !== commentId,
              );
              return { ...c, replies: updatedReplies };
            }
            return c;
          });
        } else {
          updatedComments = updatedComments.filter((c) => c.id !== commentId);
        }

        // Optimistic UI state update
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments: updatedComments } : p,
          ),
        );
        showToast("Đã thu hồi thành công!");

        try {
          await updateDoc(doc(db, "posts", postId), {
            comments: updatedComments,
          });
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  // Like Comment
  const handleLikeComment = async (
    postId: string,
    commentId: string,
    isReply: boolean = false,
    parentCommentId?: string,
  ) => {
    if (!user) return showToast("Vui lòng đăng nhập!");
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    let updatedComments = [...post.comments];
    if (isReply && parentCommentId) {
      updatedComments = updatedComments.map((c) => {
        if (c.id === parentCommentId) {
          const updatedReplies = (c.replies || []).map((r) => {
            if (r.id === commentId) {
              const likes = r.likes || [];
              const newLikes = likes.includes(user.uid)
                ? likes.filter((id) => id !== user.uid)
                : [...likes, user.uid];
              return { ...r, likes: newLikes };
            }
            return r;
          });
          return { ...c, replies: updatedReplies };
        }
        return c;
      });
    } else {
      updatedComments = updatedComments.map((c) => {
        if (c.id === commentId) {
          const likes = c.likes || [];
          const newLikes = likes.includes(user.uid)
            ? likes.filter((id) => id !== user.uid)
            : [...likes, user.uid];
          return { ...c, likes: newLikes };
        }
        return c;
      });
    }

    // Optimistic UI state update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: updatedComments } : p,
      ),
    );

    try {
      await updateDoc(doc(db, "posts", postId), { comments: updatedComments });
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    if (!user) return showToast("Vui lòng đăng nhập để xóa bài viết!");

    setConfirmModal({
      open: true,
      title: "Xóa Bài Viết",
      message:
        "Bạn có chắc chắn muốn xóa bài viết này? Bài viết và toàn bộ bình luận liên quan sẽ bị gỡ bỏ vĩnh viễn.",
      confirmText: "Xóa Bài Viết",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        // Optimistic UI state update
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setActiveMenuId(null);
        showToast("Đã xóa bài viết thành công!");

        try {
          await deleteDoc(doc(db, "posts", postId));
        } catch (e: any) {
          console.error(e);
        }
      },
    });
  };

  // Share Post Handler
  const handleSharePost = (postId: string) => {
    const postUrl = `${window.location.origin}/trung-tam/cong-dong?post=${postId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(postUrl)
        .then(() => {
          showToast("Đã sao chép liên kết chia sẻ bài viết!");
        })
        .catch(() => {
          prompt("Sao chép liên kết bài viết:", postUrl);
        });
    } else {
      prompt("Sao chép liên kết bài viết:", postUrl);
    }
  };

  // Edit Post
  const handleSaveEdit = async () => {
    if (!editingPostId || !editContent.trim()) return;

    if (editContent.trim()) {
      setIsModerating(true);
      try {
        const modData = await callCommunityApi<CommunityModerationResponse>(
          "moderate",
          {
            text: editContent,
            type: "post",
          },
        );
        if (!modData.approved) {
          setIsModerating(false);
          setModerationWarning({
            open: true,
            reason:
              modData.reason ||
              "Nội dung chỉnh sửa chứa từ ngữ không phù hợp hoặc vi phạm quy tắc cộng đồng.",
          });
          return;
        }
      } catch (e) {
        console.warn("Moderation skip in edit due to error:", e);
      }
      setIsModerating(false);
    }

    setIsUploading(true);
    try {
      const uploadedImages = [...editPostImages];
      for (const img of editNewPostImages) {
        const url = await uploadFileToCloudinary(img);
        uploadedImages.push(url);
      }
      const uploadedFiles = [...editPostAttachedFiles];
      for (const f of editNewPostFiles) {
        const url = await uploadFileToCloudinary(f);
        uploadedFiles.push({ url, name: f.name });
      }

      await updateDoc(doc(db, "posts", editingPostId), {
        content: editContent,
        imageUrls: uploadedImages,
        attachedFiles: uploadedFiles,
        imageUrl: "", // Clear legacy field
      });

      setEditingPostId(null);
      setEditContent("");
      setEditPostImages([]);
      setEditPostAttachedFiles([]);
      setEditNewPostImages([]);
      setEditNewPostFiles([]);
      showToast("Đã cập nhật bài viết!");
    } catch (e) {
      console.error(e);
      alert("Lỗi khi cập nhật bài viết!");
    }
    setIsUploading(false);
  };

  // Edit Comment / Reply with AI Moderation
  const handleSaveEditComment = async () => {
    if (!editingComment || !user) return;
    const {
      postId,
      commentId,
      parentCommentId,
      isReply,
      content,
      imageUrls = [],
      attachedFiles = [],
      newImages = [],
      newFiles = [],
    } = editingComment;
    if (
      !content.trim() &&
      imageUrls.length === 0 &&
      attachedFiles.length === 0 &&
      newImages.length === 0 &&
      newFiles.length === 0
    ) {
      showToast("Nội dung không được để trống!");
      return;
    }

    if (content.trim()) {
      setIsModerating(true);
      try {
        const modData = await callCommunityApi<CommunityModerationResponse>(
          "moderate",
          {
            text: content,
            type: "comment",
          },
        );
        if (!modData.approved) {
          setIsModerating(false);
          setModerationWarning({
            open: true,
            reason:
              modData.reason ||
              "Nội dung chỉnh sửa chứa từ ngữ không phù hợp hoặc vi phạm quy tắc cộng đồng.",
          });
          return;
        }
      } catch (e) {
        console.warn(e);
      }
      setIsModerating(false);
    }

    setIsUploading(true);
    let finalImageUrls = [...imageUrls];
    let finalAttachedFiles = [...attachedFiles];
    try {
      for (const img of newImages) {
        const url = await uploadFileToCloudinary(img);
        finalImageUrls.push(url);
      }
      for (const f of newFiles) {
        const url = await uploadFileToCloudinary(f);
        finalAttachedFiles.push({ url, name: f.name });
      }
    } catch (e) {
      console.error("Upload error during editing comment:", e);
    }
    setIsUploading(false);

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    let updatedComments = [...(post.comments || [])];
    if (isReply && parentCommentId) {
      updatedComments = updatedComments.map((c) => {
        if (c.id === parentCommentId) {
          const updatedReplies = (c.replies || []).map((r) => {
            if (r.id === commentId) {
              return {
                ...r,
                content,
                imageUrls: finalImageUrls,
                attachedFiles: finalAttachedFiles,
                imageUrl: "", // Clear legacy field
                aiVerified: true,
              };
            }
            return r;
          });
          return { ...c, replies: updatedReplies };
        }
        return c;
      });
    } else {
      updatedComments = updatedComments.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            content,
            imageUrls: finalImageUrls,
            attachedFiles: finalAttachedFiles,
            imageUrl: "", // Clear legacy field
            aiVerified: true,
          };
        }
        return c;
      });
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: updatedComments } : p,
      ),
    );
    setEditingComment(null);
    showToast("Đã cập nhật bình luận!");

    try {
      await updateDoc(doc(db, "posts", postId), { comments: updatedComments });
    } catch (e) {
      console.error(e);
    }
  };

  // Gemini Chat Handler
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput.trim();
    if (!textToSend || isChatSending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedMessages = [...chatMessages, userMsg];

    // Update active session in state
    setChatSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          // Generate title from first user prompt if default
          const newTitle =
            s.messages.length <= 1 ? textToSend.slice(0, 24) + "..." : s.title;
          return {
            ...s,
            title: newTitle,
            messages: updatedMessages,
          };
        }
        return s;
      }),
    );

    if (!presetText) setChatInput("");
    setIsChatSending(true);

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const data = await callCommunityApi<CommunityChatResponse>("chat", {
        messages: apiMessages,
      });

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: data.text || "Rất tiếc, không thể phản hồi vào lúc này.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...updatedMessages, modelMsg],
            };
          }
          return s;
        }),
      );
    } catch (e) {
      console.error(e);
      setChatSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [
                ...updatedMessages,
                {
                  id: (Date.now() + 1).toString(),
                  role: "model",
                  content: "Lỗi kết nối tới hệ thống AI. Vui lòng thử lại sau!",
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ],
            };
          }
          return s;
        }),
      );
    }
    setIsChatSending(false);
  };

  // Create New Chat Session
  const handleCreateNewChatSession = () => {
    const newSessionId = "session-" + Date.now();
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Hỏi đáp Hóa Học ${chatSessions.length + 1}`,
      createdAt: new Date().toLocaleDateString("vi-VN"),
      messages: [
        {
          id: Date.now().toString(),
          role: "model",
          content:
            "Bắt đầu cuộc trò chuyện mới! Hãy đặt câu hỏi bất kỳ về Hóa học cho tôi nhé.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setIsChatHistoryOpen(false);
  };

  // Delete Chat Session
  const handleDeleteChatSession = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chatSessions.length <= 1) {
      alert("Phải giữ lại ít nhất một cuộc trò chuyện!");
      return;
    }
    const filtered = chatSessions.filter((s) => s.id !== idToDelete);
    setChatSessions(filtered);
    if (activeSessionId === idToDelete) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const copyToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Filter posts based on AI search matching IDs or text filter
  const displayedPosts = posts.filter((post) => {
    if (aiSearchMatchingIds) {
      return aiSearchMatchingIds.includes(post.id);
    }
    if (externalSearchQuery) {
      const q = externalSearchQuery.toLowerCase();
      return (
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-4">
        <RefreshCw className="animate-spin mx-auto text-blue-500" size={32} />
        <p>Đang tải dữ liệu cộng đồng...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6 pb-20">
      {/* Top Banner Navigation */}
      <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur border border-slate-700/50 p-3 sm:p-4 rounded-2xl shadow-xl w-full max-w-full shrink-0 overflow-x-auto no-scrollbar touch-pan-x">
        <div className="flex items-center gap-2.5 pl-1 shrink-0">
          <MessageCircle size={20} className="text-blue-400" />
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
            Cộng Đồng
          </span>
        </div>

        {/* User Profile Action */}
        {!user ? (
          <button
            onClick={loginWithGoogle}
            className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-md"
          >
            <User size={16} /> Đăng nhập
          </button>
        ) : (
          <div className="flex items-center gap-3 pr-1">
            <img
              src={user.photoURL || ""}
              alt="avatar"
              className="w-8 h-8 rounded-full border border-slate-600"
            />
            <span className="text-xs font-semibold text-slate-200">
              {user.displayName?.split(" ")[0]}
            </span>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Moderation Warning Modal */}
      <AnimatePresence>
        {moderationWarning.open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-slate-800 border border-amber-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {moderationWarning.reason}
              </p>
              <button
                onClick={() =>
                  setModerationWarning({ open: false, reason: "" })
                }
                className="w-full py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition"
              >
                Đồng ý & Chỉnh sửa
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete / Recall Confirmation Modal Popup */}
      <AnimatePresence>
        {confirmModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() =>
              setConfirmModal((prev) => ({ ...prev, open: false }))
            }
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-slate-800 border border-slate-700/80 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() =>
                    setConfirmModal((prev) => ({ ...prev, open: false }))
                  }
                  className="flex-1 py-2.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/30 transition"
                >
                  {confirmModal.confirmText || "Xác Nhận"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FEED VIEW - Responsive Full Width Layout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-full mx-auto space-y-6 overflow-hidden min-w-0 px-1 sm:px-0"
      >
        {/* AI Search Banner Status */}
        {externalSearchQuery && (
          <div className="bg-gradient-to-r from-blue-900/40 to-teal-900/40 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Bot
                  size={22}
                  className={isAiSearching ? "animate-spin" : ""}
                />
              </div>
              <div>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} /> Đang phân tích
                </p>
                <p className="text-sm text-slate-200 font-medium mt-0.5">
                  {isAiSearching
                    ? "Đang phân tích dữ liệu..."
                    : aiSearchAnalysis || `Tìm kiếm: "${externalSearchQuery}"`}
                </p>
              </div>
            </div>
            {onClearSearch && (
              <button
                onClick={onClearSearch}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg border border-slate-700 transition"
              >
                Xóa lọc
              </button>
            )}
          </div>
        )}

        {/* User Auth prompt card on mobile if not logged in */}
        {!user && (
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 p-6 rounded-2xl text-center space-y-3">
            <h3 className="text-lg font-bold text-white">Diễn Đàn Hóa Học</h3>
            <p className="text-slate-400 text-sm">
              Đăng nhập với Google để trao đổi bài tập, chia sẻ thí nghiệm và
              hỏi AI.
            </p>
            <button
              onClick={loginWithGoogle}
              className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/30"
            >
              Đăng nhập với Google
            </button>
          </div>
        )}

        {/* Create Post Input */}
        {user && (
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 p-4 rounded-2xl space-y-3 shadow-lg">
            <div className="flex gap-3">
              <img
                src={user.photoURL || ""}
                alt="avatar"
                className="w-10 h-10 rounded-full border border-slate-600"
              />
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={`${user.displayName?.split(" ")[0]} ơi, bạn muốn chia sẻ câu hỏi hay tài liệu hóa học gì?`}
                className="flex-1 bg-slate-900/50 rounded-xl p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[85px] text-sm"
              />
            </div>

            {/* Selected Images Preview */}
            {postImages.length > 0 && (
              <div className="ml-13 grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {postImages.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg overflow-hidden border border-slate-700 h-20 w-20 sm:h-24 sm:w-24"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      className="h-full w-full object-cover"
                      alt="preview"
                    />
                    <button
                      onClick={() =>
                        setPostImages((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-1 hover:bg-red-700 transition"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Files Preview */}
            {postFiles.length > 0 && (
              <div className="ml-13 flex flex-col gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 font-bold">
                  Danh sách tài liệu đính kèm:
                </span>
                {postFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-900/60 rounded-xl border border-slate-700 text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-teal-400 shrink-0" />
                      <span
                        className="truncate max-w-[200px] sm:max-w-md font-medium"
                        title={file.name}
                      >
                        {truncateFileName(file.name, 25)}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setPostFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between ml-13 pt-3 border-t border-slate-700/50">
              <div className="flex items-center gap-3">
                {/* Add Images */}
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:bg-slate-700 cursor-pointer transition text-xs font-semibold">
                  <Camera size={16} className="text-emerald-400" />
                  <span className="hidden sm:inline">Hình ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setPostImages((prev) => [
                          ...prev,
                          ...Array.from(e.target.files!),
                        ]);
                      }
                    }}
                  />
                </label>

                {/* Add Files */}
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:bg-slate-700 cursor-pointer transition text-xs font-semibold">
                  <Paperclip size={16} className="text-teal-400" />
                  <span className="hidden sm:inline">Tài liệu</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setPostFiles((prev) => [
                          ...prev,
                          ...Array.from(e.target.files!),
                        ]);
                      }
                    }}
                  />
                </label>

                <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/50 px-2.5 py-1 rounded-full border border-slate-700/50">
                  <ShieldCheck size={14} className="text-blue-400" />
                </div>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={
                  isUploading ||
                  isModerating ||
                  (!newPostContent.trim() &&
                    postImages.length === 0 &&
                    postFiles.length === 0)
                }
                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2 shadow-md"
              >
                {isModerating
                  ? "Đang duyệt..."
                  : isUploading
                    ? "Đang tải lên..."
                    : "Đăng bài"}
              </button>
            </div>
          </div>
        )}

        {/* Feed Posts Stream */}
        {isLoadingPosts ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl animate-pulse space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-slate-700 rounded"></div>
                    <div className="h-3 w-20 bg-slate-700/60 rounded"></div>
                  </div>
                </div>
                <div className="h-16 bg-slate-700/40 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700/50 p-12 rounded-2xl text-center space-y-3">
            <Bot size={40} className="mx-auto text-slate-500" />
            <p className="text-slate-300 font-bold">Chưa có bài viết phù hợp</p>
            <p className="text-slate-500 text-xs">
              Hãy là người đầu tiên đăng bài hoặc thay đổi từ khóa tìm kiếm!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-800/80 backdrop-blur border border-slate-700/50 p-5 rounded-2xl space-y-4 shadow-xl relative"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        post.authorPhoto ||
                        `https://i.pravatar.cc/100?u=${post.authorId}`
                      }
                      alt="avatar"
                      className="w-10 h-10 rounded-full border border-slate-600"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-white text-sm">
                          {post.authorName}
                        </h4>
                        {post.aiVerified && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                            <CheckCircle2 size={10} />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {post.createdAt?.toDate
                          ? post.createdAt
                              .toDate()
                              .toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })
                          : "Vừa xong"}
                      </span>
                    </div>
                  </div>

                  {/* Menu Options for Post Owner */}
                  {user &&
                    (user.uid === post.authorId ||
                      !post.authorId ||
                      user.displayName === post.authorName) && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuId(
                              activeMenuId === post.id ? null : post.id,
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {activeMenuId === post.id && (
                          <div className="absolute right-0 top-8 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden w-36">
                            <button
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditContent(post.content);
                                setEditPostImages(
                                  post.imageUrls ||
                                    (post.imageUrl && isImageUrl(post.imageUrl)
                                      ? [post.imageUrl]
                                      : []),
                                );
                                const initialFiles = post.attachedFiles
                                  ? [...post.attachedFiles]
                                  : [];
                                if (
                                  post.imageUrl &&
                                  !isImageUrl(post.imageUrl)
                                ) {
                                  const filename =
                                    post.imageUrl
                                      .split("/")
                                      .pop()
                                      ?.split("?")[0] || "Tệp đính kèm";
                                  if (
                                    !initialFiles.some(
                                      (f) => f.url === post.imageUrl,
                                    )
                                  ) {
                                    initialFiles.push({
                                      url: post.imageUrl,
                                      name: filename,
                                    });
                                  }
                                }
                                setEditPostAttachedFiles(initialFiles);
                                setEditNewPostImages([]);
                                setEditNewPostFiles([]);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Edit2 size={14} /> Chỉnh sửa
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Xóa bài
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* Edit Post Form */}
                {editingPostId === post.id ? (
                  <div className="space-y-3 p-3 bg-slate-900/90 rounded-xl border border-blue-500">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-slate-800 p-3 rounded-xl text-white text-sm focus:outline-none border border-slate-700 resize-none min-h-[80px]"
                    />

                    {/* Existing and New images list */}
                    {((editPostImages && editPostImages.length > 0) ||
                      (editNewPostImages && editNewPostImages.length > 0)) && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-400 font-bold">
                          Hình ảnh bài viết:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {editPostImages.map((url, idx) => (
                            <div
                              key={`edit-exist-img-${idx}`}
                              className="relative h-16 w-16 border border-slate-700 rounded-lg overflow-hidden"
                            >
                              <img
                                src={url}
                                className="h-full w-full object-cover"
                                alt="preview"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setEditPostImages((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                              >
                                <X size={8} />
                              </button>
                            </div>
                          ))}
                          {editNewPostImages.map((file, idx) => (
                            <div
                              key={`edit-new-img-${idx}`}
                              className="relative h-16 w-16 border border-blue-500 rounded-lg overflow-hidden"
                            >
                              <img
                                src={URL.createObjectURL(file)}
                                className="h-full w-full object-cover"
                                alt="preview"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setEditNewPostImages((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                              >
                                <X size={8} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Existing and New files list */}
                    {((editPostAttachedFiles &&
                      editPostAttachedFiles.length > 0) ||
                      (editNewPostFiles && editNewPostFiles.length > 0)) && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-400 font-bold">
                          Tài liệu đính kèm:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {editPostAttachedFiles.map((file, idx) => (
                            <div
                              key={`edit-exist-file-${idx}`}
                              className="flex items-center justify-between p-2 bg-slate-800 rounded-xl text-xs text-slate-200"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText size={14} className="text-teal-400" />
                                <span className="truncate max-w-[200px] sm:max-w-md">
                                  {file.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditPostAttachedFiles((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="text-red-400 hover:text-red-300"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          {editNewPostFiles.map((file, idx) => (
                            <div
                              key={`edit-new-file-${idx}`}
                              className="flex items-center justify-between p-2 bg-slate-800 border border-blue-500 rounded-xl text-xs text-slate-200"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText size={14} className="text-blue-400" />
                                <span className="truncate max-w-[200px] sm:max-w-md">
                                  {file.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditNewPostFiles((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="text-red-400 hover:text-red-300"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Input fields to add more images and files */}
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer text-xs border border-slate-700 transition">
                        <Camera size={14} className="text-emerald-400" />
                        <span>+ Hình ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              setEditNewPostImages((prev) => [
                                ...prev,
                                ...Array.from(e.target.files!),
                              ]);
                            }
                          }}
                        />
                      </label>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer text-xs border border-slate-700 transition">
                        <Paperclip size={14} className="text-teal-400" />
                        <span>+ Tài liệu</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              setEditNewPostFiles((prev) => [
                                ...prev,
                                ...Array.from(e.target.files!),
                              ]);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setEditingPostId(null);
                          setEditNewPostImages([]);
                          setEditNewPostFiles([]);
                        }}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isUploading}
                        className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-1"
                      >
                        {isUploading && (
                          <RefreshCw size={12} className="animate-spin" />
                        )}
                        <span>Lưu bài viết</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {renderTextWithLinks(post.content)}
                    </p>
                    {renderPostAttachments(post)}
                  </>
                )}

                {/* Post Actions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 text-slate-400 font-semibold">
                  {/* Like on Left */}
                  <button
                    onClick={() => handleLike(post.id, post.likes || [])}
                    className={`flex items-center gap-1.5 hover:text-blue-400 transition p-1.5 rounded-lg hover:bg-slate-800 ${user && post.likes?.includes(user.uid) ? "text-blue-400 font-bold" : ""}`}
                    title="Yêu thích"
                  >
                    <ThumbsUp size={16} />
                    <span className="text-xs">{post.likes?.length || 0}</span>
                  </button>

                  {/* Comment and Share on Right */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1.5 hover:text-blue-400 transition p-1.5 rounded-lg hover:bg-slate-800"
                      title="Bình luận"
                    >
                      <MessageSquare size={16} />
                      <span className="text-xs">
                        {post.comments?.length || 0}
                      </span>
                    </button>

                    <button
                      onClick={() => handleSharePost(post.id)}
                      className="flex items-center gap-1.5 hover:text-blue-400 transition p-1.5 rounded-lg hover:bg-slate-800"
                      title="Chia sẻ"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Comments Section (Toggled) */}
                <AnimatePresence>
                  {expandedComments[post.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-3 border-t border-slate-700/40 space-y-3"
                    >
                      {/* List Comments */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-1">
                          {post.comments.map((c) => {
                            const isCollapsed =
                              collapsedReplies[c.id] !== false;
                            return (
                              <div key={c.id} className="space-y-2">
                                <div className="flex gap-2.5 items-start">
                                  <img
                                    src={
                                      c.authorPhoto ||
                                      `https://i.pravatar.cc/100?u=${c.authorId}`
                                    }
                                    className="w-7 h-7 rounded-full mt-1"
                                    alt="avatar"
                                  />
                                  <div className="flex-1">
                                    {editingComment &&
                                    editingComment.commentId === c.id ? (
                                      <div className="space-y-2 bg-slate-900/90 p-3 rounded-2xl border border-blue-500/80 mt-1 max-w-[90%] shadow-lg">
                                        <textarea
                                          value={editingComment.content}
                                          onChange={(e) =>
                                            setEditingComment({
                                              ...editingComment,
                                              content: e.target.value,
                                            })
                                          }
                                          className="w-full bg-slate-800 p-2 rounded-xl text-white text-xs focus:outline-none border border-slate-700 resize-none min-h-[50px]"
                                        />
                                        {/* Previews of existing and new images */}
                                        {((editingComment.imageUrls &&
                                          editingComment.imageUrls.length >
                                            0) ||
                                          (editingComment.newImages &&
                                            editingComment.newImages.length >
                                              0)) && (
                                          <div className="flex flex-wrap gap-1.5">
                                            {editingComment.imageUrls?.map(
                                              (url, idx) => (
                                                <div
                                                  key={`c-exist-img-${idx}`}
                                                  className="relative h-10 w-10 border border-slate-700 rounded overflow-hidden"
                                                >
                                                  <img
                                                    src={url}
                                                    className="h-full w-full object-cover"
                                                    alt="preview"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditingComment({
                                                        ...editingComment,
                                                        imageUrls:
                                                          editingComment.imageUrls?.filter(
                                                            (_, i) => i !== idx,
                                                          ),
                                                      })
                                                    }
                                                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                                                  >
                                                    <X size={6} />
                                                  </button>
                                                </div>
                                              ),
                                            )}
                                            {editingComment.newImages?.map(
                                              (file, idx) => (
                                                <div
                                                  key={`c-new-img-${idx}`}
                                                  className="relative h-10 w-10 border border-blue-500 rounded overflow-hidden"
                                                >
                                                  <img
                                                    src={URL.createObjectURL(
                                                      file,
                                                    )}
                                                    className="h-full w-full object-cover"
                                                    alt="preview"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditingComment({
                                                        ...editingComment,
                                                        newImages:
                                                          editingComment.newImages?.filter(
                                                            (_, i) => i !== idx,
                                                          ),
                                                      })
                                                    }
                                                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                                                  >
                                                    <X size={6} />
                                                  </button>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                        {/* Previews of existing and new files */}
                                        {((editingComment.attachedFiles &&
                                          editingComment.attachedFiles.length >
                                            0) ||
                                          (editingComment.newFiles &&
                                            editingComment.newFiles.length >
                                              0)) && (
                                          <div className="flex flex-col gap-1">
                                            {editingComment.attachedFiles?.map(
                                              (file, idx) => (
                                                <div
                                                  key={`c-exist-file-${idx}`}
                                                  className="flex items-center justify-between p-1 bg-slate-800 rounded text-[10px]"
                                                >
                                                  <span
                                                    className="truncate max-w-[120px]"
                                                    title={file.name}
                                                  >
                                                    {file.name}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditingComment({
                                                        ...editingComment,
                                                        attachedFiles:
                                                          editingComment.attachedFiles?.filter(
                                                            (_, i) => i !== idx,
                                                          ),
                                                      })
                                                    }
                                                    className="text-red-400 hover:text-red-300"
                                                  >
                                                    <X size={10} />
                                                  </button>
                                                </div>
                                              ),
                                            )}
                                            {editingComment.newFiles?.map(
                                              (file, idx) => (
                                                <div
                                                  key={`c-new-file-${idx}`}
                                                  className="flex items-center justify-between p-1 bg-slate-800 border border-blue-500 rounded text-[10px]"
                                                >
                                                  <span
                                                    className="truncate max-w-[120px]"
                                                    title={file.name}
                                                  >
                                                    {file.name}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditingComment({
                                                        ...editingComment,
                                                        newFiles:
                                                          editingComment.newFiles?.filter(
                                                            (_, i) => i !== idx,
                                                          ),
                                                      })
                                                    }
                                                    className="text-red-400 hover:text-red-300"
                                                  >
                                                    <X size={10} />
                                                  </button>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                        {/* Upload selectors */}
                                        <div className="flex items-center gap-2">
                                          <label className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer text-[10px] border border-slate-700">
                                            <Camera
                                              size={11}
                                              className="text-emerald-400"
                                            />
                                            <span>+ Ảnh</span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              multiple
                                              className="hidden"
                                              onChange={(e) => {
                                                if (e.target.files) {
                                                  setEditingComment({
                                                    ...editingComment,
                                                    newImages: [
                                                      ...(editingComment.newImages ||
                                                        []),
                                                      ...Array.from(
                                                        e.target.files,
                                                      ),
                                                    ],
                                                  });
                                                }
                                              }}
                                            />
                                          </label>
                                          <label className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer text-[10px] border border-slate-700">
                                            <Paperclip
                                              size={11}
                                              className="text-teal-400"
                                            />
                                            <span>+ File</span>
                                            <input
                                              type="file"
                                              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                                              multiple
                                              className="hidden"
                                              onChange={(e) => {
                                                if (e.target.files) {
                                                  setEditingComment({
                                                    ...editingComment,
                                                    newFiles: [
                                                      ...(editingComment.newFiles ||
                                                        []),
                                                      ...Array.from(
                                                        e.target.files,
                                                      ),
                                                    ],
                                                  });
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                        <div className="flex justify-end gap-2 text-[10px] pt-1">
                                          <button
                                            onClick={() =>
                                              setEditingComment(null)
                                            }
                                            className="px-2 py-0.5 text-slate-400 hover:text-white transition"
                                          >
                                            Hủy
                                          </button>
                                          <button
                                            onClick={handleSaveEditComment}
                                            disabled={
                                              isUploading || isModerating
                                            }
                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition flex items-center gap-1"
                                          >
                                            {isUploading || isModerating
                                              ? "Đang duyệt..."
                                              : "Lưu"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="bg-slate-900/80 px-3 py-2 rounded-2xl border border-slate-700/50 inline-block max-w-[90%] shadow-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-xs">
                                              {c.authorName}
                                            </span>
                                            {c.aiVerified && (
                                              <ShieldCheck
                                                size={12}
                                                className="text-blue-400"
                                              />
                                            )}
                                          </div>
                                          <p className="text-slate-200 text-xs mt-0.5 whitespace-pre-wrap">
                                            {renderTextWithLinks(c.content)}
                                          </p>
                                        </div>

                                        {/* Framed Image/Document Container for Comments */}
                                        {renderCommentAttachments(c)}
                                      </>
                                    )}

                                    <div className="flex items-center gap-3 ml-2 mt-1 text-[11px] text-slate-400 font-semibold">
                                      <button
                                        onClick={() =>
                                          handleLikeComment(post.id, c.id)
                                        }
                                        className={`hover:text-blue-400 ${user && c.likes?.includes(user.uid) ? "text-blue-400 font-bold" : ""}`}
                                      >
                                        Thích ({c.likes?.length || 0})
                                      </button>
                                      <button
                                        onClick={() =>
                                          setReplyingTo({
                                            postId: post.id,
                                            commentId: c.id,
                                            replyToName: c.authorName,
                                          })
                                        }
                                        className="hover:text-blue-400"
                                      >
                                        Trả lời
                                      </button>
                                      {/* Edit Comment */}
                                      {user &&
                                        (user.uid === c.authorId ||
                                          user.displayName ===
                                            c.authorName) && (
                                          <button
                                            onClick={() =>
                                              setEditingComment({
                                                postId: post.id,
                                                commentId: c.id,
                                                isReply: false,
                                                content: c.content,
                                                imageUrls:
                                                  c.imageUrls ||
                                                  (c.imageUrl &&
                                                  isImageUrl(c.imageUrl)
                                                    ? [c.imageUrl]
                                                    : []),
                                                attachedFiles:
                                                  c.attachedFiles ||
                                                  (c.imageUrl &&
                                                  !isImageUrl(c.imageUrl)
                                                    ? [
                                                        {
                                                          url: c.imageUrl,
                                                          name:
                                                            c.imageUrl
                                                              .split("/")
                                                              .pop()
                                                              ?.split("?")[0] ||
                                                            "Tài liệu",
                                                        },
                                                      ]
                                                    : []),
                                                newImages: [],
                                                newFiles: [],
                                              })
                                            }
                                            className="hover:text-blue-400 transition"
                                          >
                                            Sửa
                                          </button>
                                        )}
                                      {/* Comment Recall / Delete */}
                                      {user &&
                                        (user.uid === c.authorId ||
                                          user.displayName === c.authorName ||
                                          user.uid === post.authorId) && (
                                          <button
                                            onClick={() =>
                                              handleDeleteComment(
                                                post.id,
                                                c.id,
                                                false,
                                              )
                                            }
                                            className="hover:text-red-400 text-slate-500 transition"
                                            title="Thu hồi bình luận"
                                          >
                                            Thu hồi
                                          </button>
                                        )}
                                    </div>
                                  </div>
                                </div>

                                {/* Animated Collapsible Replies Thread */}
                                {c.replies && c.replies.length > 0 && (
                                  <div className="ml-9 mt-1">
                                    <button
                                      onClick={() =>
                                        setCollapsedReplies((prev) => ({
                                          ...prev,
                                          [c.id]:
                                            prev[c.id] === false ? true : false,
                                        }))
                                      }
                                      className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition group py-0.5"
                                    >
                                      <CornerDownRight
                                        size={13}
                                        className="text-blue-400 transition-transform group-hover:translate-x-0.5"
                                      />
                                      <span>
                                        {isCollapsed
                                          ? `Xem ${c.replies.length} phản hồi`
                                          : `Thu gọn phản hồi (${c.replies.length})`}
                                      </span>
                                      {isCollapsed ? (
                                        <ChevronDown size={12} />
                                      ) : (
                                        <ChevronUp size={12} />
                                      )}
                                    </button>

                                    <AnimatePresence>
                                      {!isCollapsed && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{
                                            opacity: 1,
                                            height: "auto",
                                          }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{
                                            duration: 0.25,
                                            ease: "easeInOut",
                                          }}
                                          className="overflow-hidden space-y-2 border-l-2 border-slate-700/60 pl-3 mt-1.5"
                                        >
                                          {c.replies.map((reply) => (
                                            <div
                                              key={reply.id}
                                              className="flex gap-2 items-start pt-1"
                                            >
                                              <img
                                                src={
                                                  reply.authorPhoto ||
                                                  `https://i.pravatar.cc/100?u=${reply.authorId}`
                                                }
                                                className="w-6 h-6 rounded-full"
                                                alt="avatar"
                                              />
                                              <div className="flex-1">
                                                {editingComment &&
                                                editingComment.commentId ===
                                                  reply.id ? (
                                                  <div className="space-y-2 bg-slate-900/90 p-3 rounded-2xl border border-blue-500/80 mt-1 max-w-[90%] shadow-lg">
                                                    <textarea
                                                      value={
                                                        editingComment.content
                                                      }
                                                      onChange={(e) =>
                                                        setEditingComment({
                                                          ...editingComment,
                                                          content:
                                                            e.target.value,
                                                        })
                                                      }
                                                      className="w-full bg-slate-800 p-2 rounded-xl text-white text-xs focus:outline-none border border-slate-700 resize-none min-h-[50px]"
                                                    />
                                                    {/* Previews of existing and new images */}
                                                    {((editingComment.imageUrls &&
                                                      editingComment.imageUrls
                                                        .length > 0) ||
                                                      (editingComment.newImages &&
                                                        editingComment.newImages
                                                          .length > 0)) && (
                                                      <div className="flex flex-wrap gap-1.5">
                                                        {editingComment.imageUrls?.map(
                                                          (url, idx) => (
                                                            <div
                                                              key={`r-exist-img-${idx}`}
                                                              className="relative h-10 w-10 border border-slate-700 rounded overflow-hidden"
                                                            >
                                                              <img
                                                                src={url}
                                                                className="h-full w-full object-cover"
                                                                alt="preview"
                                                              />
                                                              <button
                                                                type="button"
                                                                onClick={() =>
                                                                  setEditingComment(
                                                                    {
                                                                      ...editingComment,
                                                                      imageUrls:
                                                                        editingComment.imageUrls?.filter(
                                                                          (
                                                                            _,
                                                                            i,
                                                                          ) =>
                                                                            i !==
                                                                            idx,
                                                                        ),
                                                                    },
                                                                  )
                                                                }
                                                                className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                                                              >
                                                                <X size={6} />
                                                              </button>
                                                            </div>
                                                          ),
                                                        )}
                                                        {editingComment.newImages?.map(
                                                          (file, idx) => (
                                                            <div
                                                              key={`r-new-img-${idx}`}
                                                              className="relative h-10 w-10 border border-blue-500 rounded overflow-hidden"
                                                            >
                                                              <img
                                                                src={URL.createObjectURL(
                                                                  file,
                                                                )}
                                                                className="h-full w-full object-cover"
                                                                alt="preview"
                                                              />
                                                              <button
                                                                type="button"
                                                                onClick={() =>
                                                                  setEditingComment(
                                                                    {
                                                                      ...editingComment,
                                                                      newImages:
                                                                        editingComment.newImages?.filter(
                                                                          (
                                                                            _,
                                                                            i,
                                                                          ) =>
                                                                            i !==
                                                                            idx,
                                                                        ),
                                                                    },
                                                                  )
                                                                }
                                                                className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                                                              >
                                                                <X size={6} />
                                                              </button>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    )}
                                                    {/* Previews of existing and new files */}
                                                    {((editingComment.attachedFiles &&
                                                      editingComment
                                                        .attachedFiles.length >
                                                        0) ||
                                                      (editingComment.newFiles &&
                                                        editingComment.newFiles
                                                          .length > 0)) && (
                                                      <div className="flex flex-col gap-1">
                                                        {editingComment.attachedFiles?.map(
                                                          (file, idx) => (
                                                            <div
                                                              key={`r-exist-file-${idx}`}
                                                              className="flex items-center justify-between p-1 bg-slate-800 rounded text-[10px]"
                                                            >
                                                              <span
                                                                className="truncate max-w-[120px]"
                                                                title={
                                                                  file.name
                                                                }
                                                              >
                                                                {truncateFileName(
                                                                  file.name,
                                                                  15,
                                                                )}
                                                              </span>
                                                              <button
                                                                type="button"
                                                                onClick={() =>
                                                                  setEditingComment(
                                                                    {
                                                                      ...editingComment,
                                                                      attachedFiles:
                                                                        editingComment.attachedFiles?.filter(
                                                                          (
                                                                            _,
                                                                            i,
                                                                          ) =>
                                                                            i !==
                                                                            idx,
                                                                        ),
                                                                    },
                                                                  )
                                                                }
                                                                className="text-red-400 hover:text-red-300"
                                                              >
                                                                <X size={10} />
                                                              </button>
                                                            </div>
                                                          ),
                                                        )}
                                                        {editingComment.newFiles?.map(
                                                          (file, idx) => (
                                                            <div
                                                              key={`r-new-file-${idx}`}
                                                              className="flex items-center justify-between p-1 bg-slate-800 border border-blue-500 rounded text-[10px]"
                                                            >
                                                              <span
                                                                className="truncate max-w-[120px]"
                                                                title={
                                                                  file.name
                                                                }
                                                              >
                                                                {truncateFileName(
                                                                  file.name,
                                                                  15,
                                                                )}
                                                              </span>
                                                              <button
                                                                type="button"
                                                                onClick={() =>
                                                                  setEditingComment(
                                                                    {
                                                                      ...editingComment,
                                                                      newFiles:
                                                                        editingComment.newFiles?.filter(
                                                                          (
                                                                            _,
                                                                            i,
                                                                          ) =>
                                                                            i !==
                                                                            idx,
                                                                        ),
                                                                    },
                                                                  )
                                                                }
                                                                className="text-red-400 hover:text-red-300"
                                                              >
                                                                <X size={10} />
                                                              </button>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    )}
                                                    {/* Upload selectors */}
                                                    <div className="flex items-center gap-2">
                                                      <label className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer text-[10px] border border-slate-700">
                                                        <Camera
                                                          size={11}
                                                          className="text-emerald-400"
                                                        />
                                                        <span>+ Ảnh</span>
                                                        <input
                                                          type="file"
                                                          accept="image/*"
                                                          multiple
                                                          className="hidden"
                                                          onChange={(e) => {
                                                            if (
                                                              e.target.files
                                                            ) {
                                                              setEditingComment(
                                                                {
                                                                  ...editingComment,
                                                                  newImages: [
                                                                    ...(editingComment.newImages ||
                                                                      []),
                                                                    ...Array.from(
                                                                      e.target
                                                                        .files,
                                                                    ),
                                                                  ],
                                                                },
                                                              );
                                                            }
                                                          }}
                                                        />
                                                      </label>
                                                      <label className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer text-[10px] border border-slate-700">
                                                        <Paperclip
                                                          size={11}
                                                          className="text-teal-400"
                                                        />
                                                        <span>+ File</span>
                                                        <input
                                                          type="file"
                                                          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                                                          multiple
                                                          className="hidden"
                                                          onChange={(e) => {
                                                            if (
                                                              e.target.files
                                                            ) {
                                                              setEditingComment(
                                                                {
                                                                  ...editingComment,
                                                                  newFiles: [
                                                                    ...(editingComment.newFiles ||
                                                                      []),
                                                                    ...Array.from(
                                                                      e.target
                                                                        .files,
                                                                    ),
                                                                  ],
                                                                },
                                                              );
                                                            }
                                                          }}
                                                        />
                                                      </label>
                                                    </div>
                                                    <div className="flex justify-end gap-2 text-[10px] pt-1">
                                                      <button
                                                        onClick={() =>
                                                          setEditingComment(
                                                            null,
                                                          )
                                                        }
                                                        className="px-2 py-0.5 text-slate-400 hover:text-white transition"
                                                      >
                                                        Hủy
                                                      </button>
                                                      <button
                                                        onClick={
                                                          handleSaveEditComment
                                                        }
                                                        disabled={
                                                          isUploading ||
                                                          isModerating
                                                        }
                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition flex items-center gap-1"
                                                      >
                                                        {isUploading ||
                                                        isModerating
                                                          ? "Đang duyệt..."
                                                          : "Lưu"}
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/40 inline-block max-w-[90%] shadow-sm">
                                                      <span className="font-bold text-slate-200 text-xs">
                                                        {reply.authorName}
                                                      </span>
                                                      <p className="text-slate-300 text-xs mt-0.5 whitespace-pre-wrap">
                                                        {renderTextWithLinks(
                                                          reply.content,
                                                        )}
                                                      </p>
                                                    </div>

                                                    {/* Framed Image/Document Container for Replies */}
                                                    {renderCommentAttachments(
                                                      reply,
                                                    )}
                                                  </>
                                                )}

                                                <div className="flex items-center gap-3 ml-2 mt-1 text-[11px] text-slate-400 font-semibold">
                                                  <button
                                                    onClick={() =>
                                                      handleLikeComment(
                                                        post.id,
                                                        reply.id,
                                                        true,
                                                        c.id,
                                                      )
                                                    }
                                                    className={`hover:text-blue-400 ${user && reply.likes?.includes(user.uid) ? "text-blue-400 font-bold" : ""}`}
                                                  >
                                                    Thích (
                                                    {reply.likes?.length || 0})
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      setReplyingTo({
                                                        postId: post.id,
                                                        commentId: c.id,
                                                        replyToName:
                                                          reply.authorName,
                                                      })
                                                    }
                                                    className="hover:text-blue-400"
                                                  >
                                                    Trả lời
                                                  </button>
                                                  {/* Edit Reply */}
                                                  {user &&
                                                    (user.uid ===
                                                      reply.authorId ||
                                                      user.displayName ===
                                                        reply.authorName) && (
                                                      <button
                                                        onClick={() =>
                                                          setEditingComment({
                                                            postId: post.id,
                                                            commentId: reply.id,
                                                            parentCommentId:
                                                              c.id,
                                                            isReply: true,
                                                            content:
                                                              reply.content,
                                                            imageUrls:
                                                              reply.imageUrls ||
                                                              (reply.imageUrl &&
                                                              isImageUrl(
                                                                reply.imageUrl,
                                                              )
                                                                ? [
                                                                    reply.imageUrl,
                                                                  ]
                                                                : []),
                                                            attachedFiles:
                                                              reply.attachedFiles ||
                                                              [],
                                                            newImages: [],
                                                            newFiles: [],
                                                          })
                                                        }
                                                        className="hover:text-blue-400 transition"
                                                      >
                                                        Sửa
                                                      </button>
                                                    )}
                                                  {/* Reply Recall / Delete */}
                                                  {user &&
                                                    (user.uid ===
                                                      reply.authorId ||
                                                      user.displayName ===
                                                        reply.authorName ||
                                                      user.uid ===
                                                        post.authorId) && (
                                                      <button
                                                        onClick={() =>
                                                          handleDeleteComment(
                                                            post.id,
                                                            reply.id,
                                                            true,
                                                            c.id,
                                                          )
                                                        }
                                                        className="hover:text-red-400 text-slate-500 transition"
                                                        title="Thu hồi phản hồi"
                                                      >
                                                        Thu hồi
                                                      </button>
                                                    )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Comment Input Box */}
                      {user ? (
                        <div className="flex gap-2.5 mt-3 items-start pt-2 border-t border-slate-700/40">
                          <img
                            src={user.photoURL || ""}
                            className="w-7 h-7 rounded-full mt-1 border border-slate-600"
                            alt="avatar"
                          />
                          <div className="flex-1 bg-slate-800/80 rounded-2xl border border-slate-700 focus-within:border-blue-500 overflow-hidden relative">
                            {replyingTo && replyingTo.postId === post.id && (
                              <div className="px-3 py-1 bg-slate-900 text-[11px] text-blue-400 font-semibold flex justify-between items-center border-b border-slate-700">
                                <span>
                                  Đang trả lời @
                                  {replyingTo.replyToName || "Bình luận"}
                                </span>
                                <button
                                  onClick={() => setReplyingTo(null)}
                                  className="hover:text-white text-slate-400"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                            <textarea
                              placeholder="Viết bình luận (AI kiểm duyệt)..."
                              value={commentText[post.id] || ""}
                              onChange={(e) =>
                                setCommentText({
                                  ...commentText,
                                  [post.id]: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleComment(post.id);
                                }
                              }}
                              className="w-full bg-transparent text-xs text-white px-3 py-2 focus:outline-none resize-none min-h-[42px] max-h-[100px]"
                            />

                            {/* Selected Images Preview */}
                            {commentImages[post.id] &&
                              commentImages[post.id].length > 0 && (
                                <div className="flex flex-wrap gap-1.5 px-3 mb-2">
                                  {commentImages[post.id].map((file, idx) => (
                                    <div
                                      key={`c-img-${idx}`}
                                      className="relative h-12 w-12 border border-slate-700 rounded-lg overflow-hidden shrink-0"
                                    >
                                      <img
                                        src={URL.createObjectURL(file)}
                                        className="h-full w-full object-cover"
                                        alt="comment img preview"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCommentImages((prev) => ({
                                            ...prev,
                                            [post.id]: prev[post.id].filter(
                                              (_, i) => i !== idx,
                                            ),
                                          }))
                                        }
                                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                                      >
                                        <X size={8} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {/* Selected Files Preview */}
                            {commentFiles[post.id] &&
                              commentFiles[post.id].length > 0 && (
                                <div className="flex flex-col gap-1 px-3 mb-2">
                                  {commentFiles[post.id].map((file, idx) => (
                                    <div
                                      key={`c-file-${idx}`}
                                      className="flex items-center justify-between p-1 bg-slate-900/60 rounded-lg text-[10px] text-slate-300 border border-slate-700/50"
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <FileText
                                          size={12}
                                          className="text-teal-400 shrink-0"
                                        />
                                        <span
                                          className="truncate max-w-[150px]"
                                          title={file.name}
                                        >
                                          {truncateFileName(file.name, 18)}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCommentFiles((prev) => ({
                                            ...prev,
                                            [post.id]: prev[post.id].filter(
                                              (_, i) => i !== idx,
                                            ),
                                          }))
                                        }
                                        className="text-red-400 hover:text-red-300 ml-1"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                            <div className="flex justify-between items-center px-2 py-1 bg-slate-900/30">
                              <div className="flex items-center gap-1.5">
                                {/* Camera for multiple images */}
                                <label
                                  className="p-1 text-slate-400 hover:text-white cursor-pointer transition"
                                  title="Đính kèm ảnh"
                                >
                                  <Camera size={15} />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        const newImgs = Array.from(
                                          e.target.files,
                                        );
                                        setCommentImages((prev) => ({
                                          ...prev,
                                          [post.id]: [
                                            ...(prev[post.id] || []),
                                            ...newImgs,
                                          ],
                                        }));
                                      }
                                    }}
                                  />
                                </label>
                                {/* Paperclip for multiple files */}
                                <label
                                  className="p-1 text-slate-400 hover:text-white cursor-pointer transition"
                                  title="Đính kèm tài liệu"
                                >
                                  <Paperclip size={15} />
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        const newFiles = Array.from(
                                          e.target.files,
                                        );
                                        setCommentFiles((prev) => ({
                                          ...prev,
                                          [post.id]: [
                                            ...(prev[post.id] || []),
                                            ...newFiles,
                                          ],
                                        }));
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                              <button
                                onClick={() => handleComment(post.id)}
                                disabled={
                                  isUploading ||
                                  isModerating ||
                                  (!commentText[post.id]?.trim() &&
                                    (!commentImages[post.id] ||
                                      commentImages[post.id].length === 0) &&
                                    (!commentFiles[post.id] ||
                                      commentFiles[post.id].length === 0))
                                }
                                className="p-1.5 text-blue-400 hover:bg-slate-700 rounded-full transition disabled:opacity-40"
                              >
                                <Send size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2 bg-slate-800/40 rounded-xl border border-slate-700/40">
                          <button
                            onClick={loginWithGoogle}
                            className="text-xs text-blue-400 font-bold hover:underline"
                          >
                            Đăng nhập để tham gia bình luận
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-blue-400/40"
          >
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Post Detail Popup (Nearly full page overlay) */}
      <AnimatePresence>
        {selectedPostId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={handleClosePostDetail}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                    Chi tiết bài viết
                  </span>
                </div>
                <button
                  onClick={handleClosePostDetail}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition"
                  title="Đóng"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto no-scrollbar">
                {!selectedPost ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <RefreshCw
                      className="text-blue-400 animate-spin"
                      size={32}
                    />
                    <p className="text-slate-400 text-sm">
                      Đang tải chi tiết bài viết...
                    </p>
                  </div>
                ) : (
                  (() => {
                    const post = selectedPost;
                    return (
                      <div className="space-y-4">
                        {/* Post Content & Author */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                post.authorPhoto ||
                                `https://i.pravatar.cc/100?u=${post.authorId}`
                              }
                              alt="avatar"
                              className="w-10 h-10 rounded-full border border-slate-600"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-white text-sm">
                                  {post.authorName}
                                </h4>
                                {post.aiVerified && (
                                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                                    <CheckCircle2 size={10} />
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {post.createdAt?.toDate
                                  ? post.createdAt
                                      .toDate()
                                      .toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        day: "2-digit",
                                        month: "2-digit",
                                      })
                                  : "Vừa xong"}
                              </span>
                            </div>
                          </div>

                          {/* Menu Options for Post Owner */}
                          {user &&
                            (user.uid === post.authorId ||
                              !post.authorId ||
                              user.displayName === post.authorName) && (
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setActiveMenuId(
                                      activeMenuId === `popup-${post.id}`
                                        ? null
                                        : `popup-${post.id}`,
                                    )
                                  }
                                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                                >
                                  <MoreHorizontal size={18} />
                                </button>

                                {activeMenuId === `popup-${post.id}` && (
                                  <div className="absolute right-0 top-8 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden w-36">
                                    <button
                                      onClick={() => {
                                        setEditingPostId(post.id);
                                        setEditContent(post.content);
                                        setEditPostImages(
                                          post.imageUrls ||
                                            (post.imageUrl &&
                                            isImageUrl(post.imageUrl)
                                              ? [post.imageUrl]
                                              : []),
                                        );
                                        const initialFiles = post.attachedFiles
                                          ? [...post.attachedFiles]
                                          : [];
                                        if (
                                          post.imageUrl &&
                                          !isImageUrl(post.imageUrl)
                                        ) {
                                          const filename =
                                            post.imageUrl
                                              .split("/")
                                              .pop()
                                              ?.split("?")[0] || "Tệp đính kèm";
                                          if (
                                            !initialFiles.some(
                                              (f) => f.url === post.imageUrl,
                                            )
                                          ) {
                                            initialFiles.push({
                                              url: post.imageUrl,
                                              name: filename,
                                            });
                                          }
                                        }
                                        setEditPostAttachedFiles(initialFiles);
                                        setEditNewPostImages([]);
                                        setEditNewPostFiles([]);
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <Edit2 size={14} /> Chỉnh sửa
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDeletePost(post.id);
                                        handleClosePostDetail();
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <Trash2 size={14} /> Xóa bài
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>

                        {/* Edit Post Form inside popup */}
                        {editingPostId === post.id ? (
                          <div className="space-y-3 p-3 bg-slate-900/90 rounded-xl border border-blue-500">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full bg-slate-800 p-3 rounded-xl text-white text-sm focus:outline-none border border-slate-700 resize-none min-h-[80px]"
                            />

                            {/* Existing and New images list */}
                            {((editPostImages && editPostImages.length > 0) ||
                              (editNewPostImages &&
                                editNewPostImages.length > 0)) && (
                              <div className="space-y-1.5">
                                <span className="text-[11px] text-slate-400 font-bold">
                                  Hình ảnh bài viết:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {editPostImages.map((url, idx) => (
                                    <div
                                      key={`popup-edit-exist-img-${idx}`}
                                      className="relative h-16 w-16 border border-slate-700 rounded-lg overflow-hidden"
                                    >
                                      <img
                                        src={url}
                                        className="h-full w-full object-cover"
                                        alt="preview"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditPostImages((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                          )
                                        }
                                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                                      >
                                        <X size={8} />
                                      </button>
                                    </div>
                                  ))}
                                  {editNewPostImages.map((file, idx) => (
                                    <div
                                      key={`popup-edit-new-img-${idx}`}
                                      className="relative h-16 w-16 border border-blue-500 rounded-lg overflow-hidden"
                                    >
                                      <img
                                        src={URL.createObjectURL(file)}
                                        className="h-full w-full object-cover"
                                        alt="preview"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditNewPostImages((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                          )
                                        }
                                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                                      >
                                        <X size={8} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Existing and New files list */}
                            {((editPostAttachedFiles &&
                              editPostAttachedFiles.length > 0) ||
                              (editNewPostFiles &&
                                editNewPostFiles.length > 0)) && (
                              <div className="space-y-1.5">
                                <span className="text-[11px] text-slate-400 font-bold">
                                  Tài liệu đính kèm:
                                </span>
                                <div className="flex flex-col gap-1.5">
                                  {editPostAttachedFiles.map((file, idx) => (
                                    <div
                                      key={`popup-edit-exist-file-${idx}`}
                                      className="flex items-center justify-between p-2 bg-slate-800 rounded-xl text-xs text-slate-200"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <FileText
                                          size={14}
                                          className="text-teal-400"
                                        />
                                        <span className="truncate max-w-[200px] sm:max-w-md">
                                          {file.name}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditPostAttachedFiles((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                          )
                                        }
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  {editNewPostFiles.map((file, idx) => (
                                    <div
                                      key={`popup-edit-new-file-${idx}`}
                                      className="flex items-center justify-between p-2 bg-slate-800 border border-blue-500 rounded-xl text-xs text-slate-200"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <FileText
                                          size={14}
                                          className="text-blue-400"
                                        />
                                        <span className="truncate max-w-[200px] sm:max-w-md">
                                          {file.name}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditNewPostFiles((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                          )
                                        }
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer text-xs border border-slate-700 transition">
                                <Camera
                                  size={14}
                                  className="text-emerald-400"
                                />
                                <span>+ Hình ảnh</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      setEditNewPostImages((prev) => [
                                        ...prev,
                                        ...Array.from(e.target.files!),
                                      ]);
                                    }
                                  }}
                                />
                              </label>
                              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer text-xs border border-slate-700 transition">
                                <Paperclip
                                  size={14}
                                  className="text-teal-400"
                                />
                                <span>+ Tài liệu</span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      setEditNewPostFiles((prev) => [
                                        ...prev,
                                        ...Array.from(e.target.files!),
                                      ]);
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                              <button
                                onClick={() => {
                                  setEditingPostId(null);
                                  setEditNewPostImages([]);
                                  setEditNewPostFiles([]);
                                }}
                                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                disabled={isUploading}
                                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-1"
                              >
                                {isUploading && (
                                  <RefreshCw
                                    size={12}
                                    className="animate-spin"
                                  />
                                )}
                                <span>Lưu bài viết</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                              {renderTextWithLinks(post.content)}
                            </p>
                            {renderPostAttachments(post)}
                          </>
                        )}

                        {/* Post Actions Bar */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 text-slate-400 font-semibold">
                          <button
                            onClick={() =>
                              handleLike(post.id, post.likes || [])
                            }
                            className={`flex items-center gap-1.5 hover:text-blue-400 transition p-1.5 rounded-lg hover:bg-slate-800 ${user && post.likes?.includes(user.uid) ? "text-blue-400 font-bold" : ""}`}
                            title="Yêu thích"
                          >
                            <ThumbsUp size={16} />
                            <span className="text-xs">
                              {post.likes?.length || 0}
                            </span>
                          </button>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 p-1.5 text-blue-400 bg-blue-500/10 rounded-lg text-xs font-semibold">
                              <MessageSquare size={16} />
                              <span>
                                Bình luận ({post.comments?.length || 0})
                              </span>
                            </div>

                            <button
                              onClick={() => handleSharePost(post.id)}
                              className="flex items-center gap-1.5 hover:text-blue-400 transition p-1.5 rounded-lg hover:bg-slate-800"
                              title="Chia sẻ"
                            >
                              <Share2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Comments List (Always Visible inside detail popup) */}
                        <div className="pt-3 border-t border-slate-700/40 space-y-3">
                          {post.comments && post.comments.length > 0 ? (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                              {post.comments.map((c) => {
                                const isCollapsed =
                                  collapsedReplies[c.id] !== false;
                                return (
                                  <div key={c.id} className="space-y-2">
                                    <div className="flex gap-2.5 items-start">
                                      <img
                                        src={
                                          c.authorPhoto ||
                                          `https://i.pravatar.cc/100?u=${c.authorId}`
                                        }
                                        className="w-7 h-7 rounded-full mt-1"
                                        alt="avatar"
                                      />
                                      <div className="flex-1">
                                        {editingComment &&
                                        editingComment.commentId === c.id ? (
                                          <div className="space-y-2 bg-slate-900/90 p-3 rounded-2xl border border-blue-500/80 mt-1 max-w-[90%] shadow-lg">
                                            <textarea
                                              value={editingComment.content}
                                              onChange={(e) =>
                                                setEditingComment({
                                                  ...editingComment,
                                                  content: e.target.value,
                                                })
                                              }
                                              className="w-full bg-slate-800 p-2 rounded-xl text-white text-xs focus:outline-none border border-slate-700 resize-none min-h-[50px]"
                                            />
                                            {/* Previews of existing and new images */}
                                            {((editingComment.imageUrls &&
                                              editingComment.imageUrls.length >
                                                0) ||
                                              (editingComment.newImages &&
                                                editingComment.newImages
                                                  .length > 0)) && (
                                              <div className="flex flex-wrap gap-1.5">
                                                {editingComment.imageUrls?.map(
                                                  (url, idx) => (
                                                    <div
                                                      key={`popup-c-exist-img-${idx}`}
                                                      className="relative h-10 w-10 border border-slate-700 rounded overflow-hidden"
                                                    >
                                                      <img
                                                        src={url}
                                                        className="h-full w-full object-cover"
                                                        alt="preview"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setEditingComment({
                                                            ...editingComment,
                                                            imageUrls:
                                                              editingComment.imageUrls?.filter(
                                                                (_, i) =>
                                                                  i !== idx,
                                                              ),
                                                          })
                                                        }
                                                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                                                      >
                                                        <X size={6} />
                                                      </button>
                                                    </div>
                                                  ),
                                                )}
                                                {editingComment.newImages?.map(
                                                  (file, idx) => (
                                                    <div
                                                      key={`popup-c-new-img-${idx}`}
                                                      className="relative h-10 w-10 border border-blue-500 rounded overflow-hidden"
                                                    >
                                                      <img
                                                        src={URL.createObjectURL(
                                                          file,
                                                        )}
                                                        className="h-full w-full object-cover"
                                                        alt="preview"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setEditingComment({
                                                            ...editingComment,
                                                            newImages:
                                                              editingComment.newImages?.filter(
                                                                (_, i) =>
                                                                  i !== idx,
                                                              ),
                                                          })
                                                        }
                                                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                                                      >
                                                        <X size={6} />
                                                      </button>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                            {/* Previews of existing and new files */}
                                            {((editingComment.attachedFiles &&
                                              editingComment.attachedFiles
                                                .length > 0) ||
                                              (editingComment.newFiles &&
                                                editingComment.newFiles.length >
                                                  0)) && (
                                              <div className="flex flex-col gap-1">
                                                {editingComment.attachedFiles?.map(
                                                  (file, idx) => (
                                                    <div
                                                      key={`popup-c-exist-file-${idx}`}
                                                      className="flex items-center justify-between p-1 bg-slate-800 rounded text-[10px]"
                                                    >
                                                      <span
                                                        className="truncate max-w-[120px]"
                                                        title={file.name}
                                                      >
                                                        {file.name}
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setEditingComment({
                                                            ...editingComment,
                                                            attachedFiles:
                                                              editingComment.attachedFiles?.filter(
                                                                (_, i) =>
                                                                  i !== idx,
                                                              ),
                                                          })
                                                        }
                                                        className="text-red-400 hover:text-red-300"
                                                      >
                                                        <X size={10} />
                                                      </button>
                                                    </div>
                                                  ),
                                                )}
                                                {editingComment.newFiles?.map(
                                                  (file, idx) => (
                                                    <div
                                                      key={`popup-c-new-file-${idx}`}
                                                      className="flex items-center justify-between p-1 bg-slate-800 border border-blue-500 rounded text-[10px]"
                                                    >
                                                      <span
                                                        className="truncate max-w-[120px]"
                                                        title={file.name}
                                                      >
                                                        {file.name}
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setEditingComment({
                                                            ...editingComment,
                                                            newFiles:
                                                              editingComment.newFiles?.filter(
                                                                (_, i) =>
                                                                  i !== idx,
                                                              ),
                                                          })
                                                        }
                                                        className="text-red-400 hover:text-red-300"
                                                      >
                                                        <X size={10} />
                                                      </button>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1.5 pt-1">
                                              <label className="p-1 text-slate-400 hover:text-white cursor-pointer transition">
                                                <Camera size={13} />
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  multiple
                                                  className="hidden"
                                                  onChange={(e) => {
                                                    if (e.target.files)
                                                      setEditingComment({
                                                        ...editingComment,
                                                        newImages: [
                                                          ...(editingComment.newImages ||
                                                            []),
                                                          ...Array.from(
                                                            e.target.files,
                                                          ),
                                                        ],
                                                      });
                                                  }}
                                                />
                                              </label>
                                              <label className="p-1 text-slate-400 hover:text-white cursor-pointer transition">
                                                <Paperclip size={13} />
                                                <input
                                                  type="file"
                                                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                                                  multiple
                                                  className="hidden"
                                                  onChange={(e) => {
                                                    if (e.target.files)
                                                      setEditingComment({
                                                        ...editingComment,
                                                        newFiles: [
                                                          ...(editingComment.newFiles ||
                                                            []),
                                                          ...Array.from(
                                                            e.target.files,
                                                          ),
                                                        ],
                                                      });
                                                  }}
                                                />
                                              </label>
                                            </div>
                                            <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-800">
                                              <button
                                                onClick={() =>
                                                  setEditingComment(null)
                                                }
                                                className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white"
                                              >
                                                Hủy
                                              </button>
                                              <button
                                                onClick={handleSaveEditComment}
                                                className="px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition"
                                              >
                                                Lưu
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-[11px] font-bold text-white">
                                                {c.authorName}
                                              </span>
                                              <span className="text-[9px] text-slate-500">
                                                {c.createdAt?.toDate
                                                  ? c.createdAt
                                                      .toDate()
                                                      .toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                      })
                                                  : "Vừa xong"}
                                              </span>
                                            </div>
                                            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                                              {renderTextWithLinks(c.content)}
                                            </p>
                                            {renderCommentAttachments(c)}

                                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold">
                                              <button
                                                onClick={() =>
                                                  handleLikeComment(
                                                    post.id,
                                                    c.id,
                                                    false,
                                                  )
                                                }
                                                className={`hover:text-blue-400 flex items-center gap-1 transition ${user && c.likes?.includes(user.uid) ? "text-blue-400 font-extrabold" : ""}`}
                                              >
                                                <Heart
                                                  size={11}
                                                  className={
                                                    user &&
                                                    c.likes?.includes(user.uid)
                                                      ? "fill-blue-400 text-blue-400"
                                                      : ""
                                                  }
                                                />
                                                <span>
                                                  {c.likes?.length || 0} Thích
                                                </span>
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setReplyingTo({
                                                    postId: post.id,
                                                    commentId: c.id,
                                                    replyToName: c.authorName,
                                                  })
                                                }
                                                className="hover:text-blue-400 flex items-center gap-0.5 transition"
                                              >
                                                Trả lời
                                              </button>
                                              {user &&
                                                (user.uid === c.authorId ||
                                                  user.displayName ===
                                                    c.authorName) && (
                                                  <>
                                                    <button
                                                      onClick={() =>
                                                        setEditingComment({
                                                          postId: post.id,
                                                          commentId: c.id,
                                                          isReply: false,
                                                          content: c.content,
                                                          imageUrls:
                                                            c.imageUrls ||
                                                            (c.imageUrl &&
                                                            isImageUrl(
                                                              c.imageUrl,
                                                            )
                                                              ? [c.imageUrl]
                                                              : []),
                                                          attachedFiles:
                                                            c.attachedFiles ||
                                                            [],
                                                        })
                                                      }
                                                      className="hover:text-blue-400 flex items-center gap-0.5 transition"
                                                    >
                                                      Sửa
                                                    </button>
                                                    <button
                                                      onClick={() =>
                                                        handleDeleteComment(
                                                          post.id,
                                                          c.id,
                                                        )
                                                      }
                                                      className="hover:text-red-400 flex items-center gap-0.5 transition"
                                                    >
                                                      Xóa
                                                    </button>
                                                  </>
                                                )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Replies List for Comment */}
                                        {c.replies && c.replies.length > 0 && (
                                          <div className="mt-2 pl-3 border-l-2 border-slate-800 space-y-2">
                                            <button
                                              onClick={() =>
                                                setCollapsedReplies({
                                                  ...collapsedReplies,
                                                  [c.id]: !isCollapsed,
                                                })
                                              }
                                              className="text-[9px] text-blue-400 font-extrabold hover:underline flex items-center gap-1 mb-1.5"
                                            >
                                              <CornerDownRight size={10} />
                                              <span>
                                                {isCollapsed
                                                  ? `Xem ${c.replies.length} câu trả lời`
                                                  : "Ẩn câu trả lời"}
                                              </span>
                                            </button>

                                            {!isCollapsed &&
                                              c.replies.map((r) => (
                                                <div
                                                  key={r.id}
                                                  className="flex gap-2 items-start bg-slate-900/35 p-2 rounded-xl border border-slate-800/40"
                                                >
                                                  <img
                                                    src={
                                                      r.authorPhoto ||
                                                      `https://i.pravatar.cc/100?u=${r.authorId}`
                                                    }
                                                    className="w-5 h-5 rounded-full mt-0.5"
                                                    alt="avatar"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    {editingComment &&
                                                    editingComment.commentId ===
                                                      r.id ? (
                                                      <div className="space-y-1.5 mt-1">
                                                        <textarea
                                                          value={
                                                            editingComment.content
                                                          }
                                                          onChange={(e) =>
                                                            setEditingComment({
                                                              ...editingComment,
                                                              content:
                                                                e.target.value,
                                                            })
                                                          }
                                                          className="w-full bg-slate-800 p-1.5 rounded-lg text-white text-[11px] focus:outline-none border border-slate-700 resize-none min-h-[40px]"
                                                        />
                                                        <div className="flex justify-end gap-1.5">
                                                          <button
                                                            onClick={() =>
                                                              setEditingComment(
                                                                null,
                                                              )
                                                            }
                                                            className="px-2 py-0.5 text-[9px] text-slate-400 hover:text-white"
                                                          >
                                                            Hủy
                                                          </button>
                                                          <button
                                                            onClick={
                                                              handleSaveEditComment
                                                            }
                                                            className="px-2.5 py-0.5 text-[9px] bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition"
                                                          >
                                                            Lưu
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <>
                                                        <div className="flex items-center justify-between mb-0.5">
                                                          <span className="text-[10px] font-bold text-white">
                                                            {r.authorName}
                                                          </span>
                                                          <span className="text-[8px] text-slate-500">
                                                            {r.createdAt?.toDate
                                                              ? r.createdAt
                                                                  .toDate()
                                                                  .toLocaleTimeString(
                                                                    [],
                                                                    {
                                                                      hour: "2-digit",
                                                                      minute:
                                                                        "2-digit",
                                                                      day: "2-digit",
                                                                      month:
                                                                        "2-digit",
                                                                    },
                                                                  )
                                                              : "Vừa xong"}
                                                          </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                                                          {renderTextWithLinks(
                                                            r.content,
                                                          )}
                                                        </p>
                                                        {renderCommentAttachments(
                                                          r,
                                                        )}

                                                        <div className="flex items-center gap-2.5 mt-1.5 text-[9px] text-slate-500 font-bold">
                                                          <button
                                                            onClick={() =>
                                                              handleLikeComment(
                                                                post.id,
                                                                r.id,
                                                                true,
                                                                c.id,
                                                              )
                                                            }
                                                            className={`hover:text-blue-400 flex items-center gap-0.5 transition ${user && r.likes?.includes(user.uid) ? "text-blue-400 font-extrabold" : ""}`}
                                                          >
                                                            <Heart
                                                              size={9}
                                                              className={
                                                                user &&
                                                                r.likes?.includes(
                                                                  user.uid,
                                                                )
                                                                  ? "fill-blue-400 text-blue-400"
                                                                  : ""
                                                              }
                                                            />
                                                            <span>
                                                              {r.likes
                                                                ?.length ||
                                                                0}{" "}
                                                              Thích
                                                            </span>
                                                          </button>
                                                          {user &&
                                                            (user.uid ===
                                                              r.authorId ||
                                                              user.displayName ===
                                                                r.authorName) && (
                                                              <>
                                                                <button
                                                                  onClick={() =>
                                                                    setEditingComment(
                                                                      {
                                                                        postId:
                                                                          post.id,
                                                                        commentId:
                                                                          r.id,
                                                                        parentCommentId:
                                                                          c.id,
                                                                        isReply: true,
                                                                        content:
                                                                          r.content,
                                                                        imageUrls:
                                                                          r.imageUrls ||
                                                                          (r.imageUrl &&
                                                                          isImageUrl(
                                                                            r.imageUrl,
                                                                          )
                                                                            ? [
                                                                                r.imageUrl,
                                                                              ]
                                                                            : []),
                                                                        attachedFiles:
                                                                          r.attachedFiles ||
                                                                          [],
                                                                      },
                                                                    )
                                                                  }
                                                                  className="hover:text-blue-400 flex items-center gap-0.5 transition"
                                                                >
                                                                  Sửa
                                                                </button>
                                                                <button
                                                                  onClick={() =>
                                                                    handleDeleteComment(
                                                                      post.id,
                                                                      r.id,
                                                                      true,
                                                                      c.id,
                                                                    )
                                                                  }
                                                                  className="hover:text-red-400 flex items-center gap-0.5 transition"
                                                                >
                                                                  Xóa
                                                                </button>
                                                              </>
                                                            )}
                                                        </div>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-800/60">
                              Chưa có bình luận nào. Hãy là người đầu tiên thảo
                              luận!
                            </div>
                          )}

                          {/* Comment Input Box inside popup */}
                          {user ? (
                            <div className="flex gap-2.5 mt-3 items-start pt-2 border-t border-slate-700/40">
                              <img
                                src={user.photoURL || ""}
                                className="w-7 h-7 rounded-full mt-1 border border-slate-600"
                                alt="avatar"
                              />
                              <div className="flex-1 bg-slate-800/80 rounded-2xl border border-slate-700 focus-within:border-blue-500 overflow-hidden relative">
                                {replyingTo &&
                                  replyingTo.postId === post.id && (
                                    <div className="px-3 py-1 bg-slate-900 text-[11px] text-blue-400 font-semibold flex justify-between items-center border-b border-slate-700">
                                      <span>
                                        Đang trả lời @
                                        {replyingTo.replyToName || "Bình luận"}
                                      </span>
                                      <button
                                        onClick={() => setReplyingTo(null)}
                                        className="hover:text-white text-slate-400"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  )}
                                <textarea
                                  placeholder="Viết bình luận (AI kiểm duyệt)..."
                                  value={commentText[post.id] || ""}
                                  onChange={(e) =>
                                    setCommentText({
                                      ...commentText,
                                      [post.id]: e.target.value,
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleComment(post.id);
                                    }
                                  }}
                                  className="w-full bg-transparent text-xs text-white px-3 py-2 focus:outline-none resize-none min-h-[42px] max-h-[100px]"
                                />

                                {/* Selected Images Preview inside popup */}
                                {commentImages[post.id] &&
                                  commentImages[post.id].length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 px-3 mb-2">
                                      {commentImages[post.id].map(
                                        (file, idx) => (
                                          <div
                                            key={`popup-c-img-${idx}`}
                                            className="relative h-12 w-12 border border-slate-700 rounded-lg overflow-hidden shrink-0"
                                          >
                                            <img
                                              src={URL.createObjectURL(file)}
                                              className="h-full w-full object-cover"
                                              alt="comment img preview"
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setCommentImages((prev) => ({
                                                  ...prev,
                                                  [post.id]: prev[
                                                    post.id
                                                  ].filter((_, i) => i !== idx),
                                                }))
                                              }
                                              className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                                            >
                                              <X size={8} />
                                            </button>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}

                                {/* Selected Files Preview inside popup */}
                                {commentFiles[post.id] &&
                                  commentFiles[post.id].length > 0 && (
                                    <div className="flex flex-col gap-1 px-3 mb-2">
                                      {commentFiles[post.id].map(
                                        (file, idx) => (
                                          <div
                                            key={`popup-c-file-${idx}`}
                                            className="flex items-center justify-between p-1 bg-slate-900/60 rounded-lg text-[10px] text-slate-300 border border-slate-700/50"
                                          >
                                            <div className="flex items-center gap-1.5 truncate">
                                              <FileText
                                                size={12}
                                                className="text-teal-400 shrink-0"
                                              />
                                              <span
                                                className="truncate max-w-[150px]"
                                                title={file.name}
                                              >
                                                {truncateFileName(
                                                  file.name,
                                                  18,
                                                )}
                                              </span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setCommentFiles((prev) => ({
                                                  ...prev,
                                                  [post.id]: prev[
                                                    post.id
                                                  ].filter((_, i) => i !== idx),
                                                }))
                                              }
                                              className="text-red-400 hover:text-red-300 ml-1"
                                            >
                                              <X size={10} />
                                            </button>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}

                                <div className="flex justify-between items-center px-2 py-1 bg-slate-900/30">
                                  <div className="flex items-center gap-1.5">
                                    <label
                                      className="p-1 text-slate-400 hover:text-white cursor-pointer transition"
                                      title="Đính kèm ảnh"
                                    >
                                      <Camera size={15} />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files) {
                                            const newImgs = Array.from(
                                              e.target.files,
                                            );
                                            setCommentImages((prev) => ({
                                              ...prev,
                                              [post.id]: [
                                                ...(prev[post.id] || []),
                                                ...newImgs,
                                              ],
                                            }));
                                          }
                                        }}
                                      />
                                    </label>
                                    <label
                                      className="p-1 text-slate-400 hover:text-white cursor-pointer transition"
                                      title="Đính kèm tài liệu"
                                    >
                                      <Paperclip size={15} />
                                      <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files) {
                                            const newFiles = Array.from(
                                              e.target.files,
                                            );
                                            setCommentFiles((prev) => ({
                                              ...prev,
                                              [post.id]: [
                                                ...(prev[post.id] || []),
                                                ...newFiles,
                                              ],
                                            }));
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                  <button
                                    onClick={() => handleComment(post.id)}
                                    disabled={
                                      isUploading ||
                                      isModerating ||
                                      (!commentText[post.id]?.trim() &&
                                        (!commentImages[post.id] ||
                                          commentImages[post.id].length ===
                                            0) &&
                                        (!commentFiles[post.id] ||
                                          commentFiles[post.id].length === 0))
                                    }
                                    className="p-1.5 text-blue-400 hover:bg-slate-700 rounded-full transition disabled:opacity-40"
                                  >
                                    <Send size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2 bg-slate-800/40 rounded-xl border border-slate-700/40">
                              <button
                                onClick={loginWithGoogle}
                                className="text-xs text-blue-400 font-bold hover:underline"
                              >
                                Đăng nhập để tham gia bình luận
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
