import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Heart,
  Share2,
  Send,
  Image as ImageIcon,
  Sparkles,
  User,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Flame,
  Paperclip,
  X,
  Edit2,
  Trash2,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  FileText,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { formatDate } from "../../utils/date";
import PublicStudentProfileModal, { StudentPublicData } from "../../components/student/PublicStudentProfileModal";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { uploadFileToCloudinary } from "../../services/cloudinary";
import { useToast } from "../../components/ui/ToastNotification";

export interface ReplyItem {
  id: string;
  authorName: string;
  authorUsername?: string;
  authorClass?: string;
  authorAvatar?: string;
  text: string;
  fileUrls?: string[];
  createdAt: any;
}

export interface CommentItem {
  id: string;
  authorName: string;
  authorUsername?: string;
  authorClass?: string;
  authorAvatar?: string;
  text: string;
  fileUrls?: string[];
  replies?: ReplyItem[];
  createdAt: any;
}

export interface PostItem {
  id: string;
  authorName: string;
  authorUsername?: string;
  authorClass?: string;
  authorAvatar?: string;
  text: string;
  imageUrl?: string;
  fileUrls?: string[];
  likedBy: string[];
  comments: CommentItem[];
  createdAt: any;
}

// Utility function to convert Firestore nested objects to plain JS objects to avoid Firestore updateDoc crashes
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export default function Community() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();

  // File input refs
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const editPostFileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const editCommentFileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLimit, setPostsLimit] = useState(10);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  // New post state
  const [postText, setPostText] = useState("");
  const [postFiles, setPostFiles] = useState<string[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Editing post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostText, setEditingPostText] = useState("");
  const [editingPostFiles, setEditingPostFiles] = useState<string[]>([]);

  // Comment input state keyed by post.id
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentFiles, setCommentFiles] = useState<Record<string, string[]>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  // Reply state
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [expandedReplyCommentIds, setExpandedReplyCommentIds] = useState<Record<string, boolean>>({});

  // Editing comment state
  const [editingComment, setEditingComment] = useState<{
    postId: string;
    commentId: string;
    text: string;
    fileUrls: string[];
  } | null>(null);

  // Custom Delete Confirm Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: "post" | "comment";
    post: PostItem;
    commentId?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Shared post popup modal state from URL query ?postId=...
  const [sharedPost, setSharedPost] = useState<PostItem | null>(null);
  const [loadingSharedPost, setLoadingSharedPost] = useState(false);

  // Modal profile view
  const [selectedStudent, setSelectedStudent] = useState<StudentPublicData | null>(null);

  // Current student user
  const [currentStudent, setCurrentStudent] = useState<{
    displayName: string;
    username: string;
    studentClass: string;
    avatarUrl?: string;
  }>({
    displayName: "Thí sinh",
    username: "student",
    studentClass: "Học sinh",
    avatarUrl: "",
  });

  useEffect(() => {
    const studentInfoStr = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
    if (studentInfoStr) {
      try {
        const parsed = JSON.parse(studentInfoStr);
        setCurrentStudent({
          displayName: parsed.displayName || parsed.name || "Thí sinh",
          username: parsed.username || "student",
          studentClass: parsed.studentClass || parsed.class || "Học sinh",
          avatarUrl: parsed.avatarUrl || "",
        });

        // Permanent sync with Firestore students collection for avatar and name
        const studentUsername = parsed.username || parsed.displayName;
        if (studentUsername && studentUsername !== "student") {
          getDoc(doc(db, "students", studentUsername)).then((snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setCurrentStudent((prev) => ({
                ...prev,
                displayName: data.name || prev.displayName,
                studentClass: data.studentClass || prev.studentClass,
                avatarUrl: data.avatarUrl || prev.avatarUrl,
              }));
            }
          });
        }
      } catch (e) {}
    }
  }, []);

  // Check URL search parameter for shared post popup
  useEffect(() => {
    const postIdParam = searchParams.get("postId");
    if (postIdParam) {
      setLoadingSharedPost(true);
      getDoc(doc(db, "community_posts", postIdParam))
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const fileUrlsList: string[] = Array.isArray(data.fileUrls)
              ? data.fileUrls
              : data.imageUrl
              ? [data.imageUrl]
              : [];
            setSharedPost({
              id: docSnap.id,
              authorName: data.authorName || "Thí sinh",
              authorUsername: data.authorUsername || "student",
              authorClass: data.authorClass || "Học sinh",
              authorAvatar: data.authorAvatar || "",
              text: data.text || "",
              imageUrl: data.imageUrl || "",
              fileUrls: fileUrlsList,
              likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
              comments: Array.isArray(data.comments)
                ? data.comments.map((cm: any) => ({
                    id: cm.id || Math.random().toString(),
                    authorName: cm.authorName || "Thí sinh",
                    authorUsername: cm.authorUsername || "student",
                    authorClass: cm.authorClass || "Học sinh",
                    authorAvatar: cm.authorAvatar || "",
                    text: cm.text || "",
                    fileUrls: Array.isArray(cm.fileUrls) ? cm.fileUrls : cm.imageUrl ? [cm.imageUrl] : [],
                    replies: Array.isArray(cm.replies) ? cm.replies : [],
                    createdAt: cm.createdAt,
                  }))
                : [],
              createdAt: data.createdAt,
            });
          } else {
            showErrorToast("Bài viết chia sẻ không tồn tại hoặc đã bị xóa!");
          }
        })
        .catch(() => showErrorToast("Lỗi khi tải bài viết được chia sẻ!"))
        .finally(() => setLoadingSharedPost(false));
    }
  }, [searchParams]);

  // Realtime Firestore feed listener
  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    if (!role) {
      navigate("/student/login", { replace: true });
      return;
    }

    setLoading(true);
    const q = query(collection(db, "community_posts"), orderBy("createdAt", "desc"), limit(postsLimit));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: PostItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          const fileUrlsList: string[] = Array.isArray(data.fileUrls)
            ? data.fileUrls
            : data.imageUrl
            ? [data.imageUrl]
            : [];

          return {
            id: d.id,
            authorName: data.authorName || "Thí sinh",
            authorUsername: data.authorUsername || "student",
            authorClass: data.authorClass || "Học sinh",
            authorAvatar: data.authorAvatar || "",
            text: data.text || "",
            imageUrl: data.imageUrl || "",
            fileUrls: fileUrlsList,
            likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
            comments: Array.isArray(data.comments)
              ? data.comments.map((cm: any) => ({
                  id: cm.id || Math.random().toString(),
                  authorName: cm.authorName || "Thí sinh",
                  authorUsername: cm.authorUsername || "student",
                  authorClass: cm.authorClass || "Học sinh",
                  authorAvatar: cm.authorAvatar || "",
                  text: cm.text || "",
                  fileUrls: Array.isArray(cm.fileUrls) ? cm.fileUrls : cm.imageUrl ? [cm.imageUrl] : [],
                  replies: Array.isArray(cm.replies) ? cm.replies : [],
                  createdAt: cm.createdAt,
                }))
              : [],
            createdAt: data.createdAt,
          };
        });
        setPosts(list);
        setHasMorePosts(snapshot.docs.length >= postsLimit);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to community posts:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [navigate, postsLimit]);

  // Upload multiple files helper
  const uploadMultipleFiles = async (files: FileList | null): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    setIsUploadingFile(true);
    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadFileToCloudinary(files[i]);
        if (url) uploadedUrls.push(url);
      }
    } catch (err) {
      console.error("Lỗi upload file:", err);
      showErrorToast("Lỗi khi tải tệp đính kèm!");
    } finally {
      setIsUploadingFile(false);
    }
    return uploadedUrls;
  };

  // Handle New Post File Upload
  const handlePostFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrls = await uploadMultipleFiles(e.target.files);
    if (newUrls.length > 0) {
      setPostFiles((prev) => [...prev, ...newUrls]);
      showSuccessToast(`Đã đính kèm ${newUrls.length} tệp!`);
    }
    if (e.target) e.target.value = "";
  };

  // Handle Edit Post File Upload
  const handleEditPostFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrls = await uploadMultipleFiles(e.target.files);
    if (newUrls.length > 0) {
      setEditingPostFiles((prev) => [...prev, ...newUrls]);
      showSuccessToast(`Đã thêm ${newUrls.length} tệp vào bài viết!`);
    }
    if (e.target) e.target.value = "";
  };

  // Handle Comment File Upload
  const handleCommentFileUpload = async (postId: string, files: FileList | null) => {
    const newUrls = await uploadMultipleFiles(files);
    if (newUrls.length > 0) {
      setCommentFiles((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), ...newUrls],
      }));
      showSuccessToast(`Đã đính kèm ${newUrls.length} tệp vào bình luận!`);
    }
  };

  // Handle Edit Comment File Upload
  const handleEditCommentFileUpload = async (files: FileList | null) => {
    if (!editingComment) return;
    const newUrls = await uploadMultipleFiles(files);
    if (newUrls.length > 0) {
      setEditingComment((prev) =>
        prev
          ? {
              ...prev,
              fileUrls: [...(prev.fileUrls || []), ...newUrls],
            }
          : null
      );
      showSuccessToast(`Đã thêm ${newUrls.length} tệp vào bình luận!`);
    }
  };

  // Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && postFiles.length === 0) return;

    setIsSubmittingPost(true);
    try {
      await addDoc(collection(db, "community_posts"), {
        authorName: currentStudent.displayName,
        authorUsername: currentStudent.username,
        authorClass: currentStudent.studentClass,
        authorAvatar: currentStudent.avatarUrl || "",
        text: postText.trim(),
        fileUrls: postFiles,
        imageUrl: postFiles[0] || "",
        likedBy: [],
        comments: [],
        createdAt: serverTimestamp(),
      });

      setPostText("");
      setPostFiles([]);
      if (postFileInputRef.current) postFileInputRef.current.value = "";
      showSuccessToast("Đã chia sẻ bài viết lên cộng đồng!");
    } catch (err) {
      console.error("Lỗi khi đăng bài:", err);
      showErrorToast("Không thể đăng bài. Vui lòng thử lại!");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Execute Deletion via ConfirmModal
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    try {
      if (deleteConfirmTarget.type === "post") {
        await deleteDoc(doc(db, "community_posts", deleteConfirmTarget.post.id));
        showSuccessToast("Đã xóa bài viết thành công!");
        if (sharedPost?.id === deleteConfirmTarget.post.id) setSharedPost(null);
      } else if (deleteConfirmTarget.type === "comment" && deleteConfirmTarget.commentId) {
        const updatedComments = deleteConfirmTarget.post.comments.filter(
          (c) => c.id !== deleteConfirmTarget.commentId
        );
        await updateDoc(doc(db, "community_posts", deleteConfirmTarget.post.id), {
          comments: sanitizeForFirestore(updatedComments),
        });
        showSuccessToast("Đã xóa bình luận!");
        if (sharedPost?.id === deleteConfirmTarget.post.id) {
          setSharedPost({ ...sharedPost, comments: updatedComments });
        }
      }
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
      showErrorToast("Không thể xóa. Vui lòng thử lại!");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmTarget(null);
    }
  };

  // Update Post by Author
  const handleSaveEditPost = async (postId: string) => {
    if (!editingPostText.trim() && editingPostFiles.length === 0) {
      showErrorToast("Bài viết không được để trống!");
      return;
    }
    try {
      await updateDoc(doc(db, "community_posts", postId), {
        text: editingPostText.trim(),
        fileUrls: editingPostFiles,
        imageUrl: editingPostFiles[0] || "",
      });
      setEditingPostId(null);
      setEditingPostText("");
      setEditingPostFiles([]);
      showSuccessToast("Cập nhật bài viết thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật bài viết:", err);
      showErrorToast("Lỗi cập nhật bài viết!");
    }
  };

  // Share Post Link
  const handleSharePost = (postId: string) => {
    const shareUrl = `${window.location.origin}/student/community?postId=${postId}`;
    navigator.clipboard.writeText(shareUrl);
    showSuccessToast("Đã sao chép liên kết chia sẻ bài viết vào bộ nhớ tạm!");
  };

  // Like / Unlike Post
  const handleToggleLike = async (post: PostItem) => {
    const myId = currentStudent.username || currentStudent.displayName;
    const isLiked = post.likedBy.includes(myId);
    const postRef = doc(db, "community_posts", post.id);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(myId),
        });
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(myId),
        });
      }
    } catch (err) {
      console.error("Lỗi khi thả tim:", err);
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    const commentText = commentInputs[postId]?.trim() || "";
    const files = commentFiles[postId] || [];
    if (!commentText && files.length === 0) return;

    const targetPost = posts.find((p) => p.id === postId) || (sharedPost?.id === postId ? sharedPost : null);
    if (!targetPost) return;

    const newComment: CommentItem = {
      id: "cm_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      authorName: currentStudent.displayName,
      authorUsername: currentStudent.username,
      authorClass: currentStudent.studentClass,
      authorAvatar: currentStudent.avatarUrl || "",
      text: commentText,
      fileUrls: files,
      replies: [],
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...(targetPost.comments || []), newComment];

    try {
      await updateDoc(doc(db, "community_posts", postId), {
        comments: sanitizeForFirestore(updatedComments),
      });

      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setCommentFiles((prev) => ({ ...prev, [postId]: [] }));
      showSuccessToast("Đã gửi bình luận!");
      if (sharedPost?.id === postId) {
        setSharedPost({ ...sharedPost, comments: updatedComments });
      }
    } catch (err) {
      console.error("Lỗi khi thêm bình luận:", err);
      showErrorToast("Không thể gửi bình luận!");
    }
  };

  // Save Edited Comment
  const handleSaveEditComment = async (post: PostItem) => {
    if (!editingComment) return;
    if (!editingComment.text.trim() && (!editingComment.fileUrls || editingComment.fileUrls.length === 0)) {
      showErrorToast("Bình luận không được để trống!");
      return;
    }

    const updatedComments = post.comments.map((c) =>
      c.id === editingComment.commentId
        ? {
            ...c,
            text: editingComment.text.trim(),
            fileUrls: editingComment.fileUrls || [],
          }
        : c
    );

    try {
      await updateDoc(doc(db, "community_posts", post.id), {
        comments: sanitizeForFirestore(updatedComments),
      });
      setEditingComment(null);
      showSuccessToast("Cập nhật bình luận thành công!");
      if (sharedPost?.id === post.id) {
        setSharedPost({ ...sharedPost, comments: updatedComments });
      }
    } catch (err) {
      console.error("Lỗi cập nhật bình luận:", err);
      showErrorToast("Lỗi cập nhật bình luận!");
    }
  };

  // Add Reply to Comment
  const handleAddReply = async (post: PostItem, commentId: string) => {
    const replyText = replyInputs[commentId]?.trim();
    if (!replyText) return;

    const newReply: ReplyItem = {
      id: "rp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      authorName: currentStudent.displayName,
      authorUsername: currentStudent.username,
      authorClass: currentStudent.studentClass,
      authorAvatar: currentStudent.avatarUrl || "",
      text: replyText,
      createdAt: new Date().toISOString(),
    };

    const updatedComments = post.comments.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply],
        };
      }
      return c;
    });

    try {
      await updateDoc(doc(db, "community_posts", post.id), {
        comments: sanitizeForFirestore(updatedComments),
      });
      setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
      setActiveReplyCommentId(null);
      setExpandedReplyCommentIds((prev) => ({ ...prev, [commentId]: true }));
      showSuccessToast("Đã gửi phản hồi!");
      if (sharedPost?.id === post.id) {
        setSharedPost({ ...sharedPost, comments: updatedComments });
      }
    } catch (err) {
      console.error("Lỗi gửi phản hồi:", err);
      showErrorToast("Lỗi gửi phản hồi!");
    }
  };

  const myIdentifier = currentStudent.username || currentStudent.displayName;

  // Render Attached Files Helper Component - Full Image Rendering without cropping
  const renderAttachments = (
    fileUrls?: string[],
    legacyImageUrl?: string,
    onRemoveUrl?: (url: string) => void
  ) => {
    const urls = fileUrls && fileUrls.length > 0 ? fileUrls : legacyImageUrl ? [legacyImageUrl] : [];
    if (urls.length === 0) return null;

    return (
      <div className="flex flex-col gap-3 mt-2">
        {urls.map((url, idx) => {
          const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
          return (
            <div key={idx} className="relative group w-full">
              {isImage ? (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center w-full my-1">
                  <img
                    src={url}
                    alt={`Đính kèm ${idx + 1}`}
                    className="w-full h-auto object-contain rounded-2xl max-h-[85vh]"
                  />
                </div>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors text-blue-700 font-bold text-xs shadow-2xs"
                >
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[220px]">Tệp đính kèm {idx + 1}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                </a>
              )}

              {onRemoveUrl && (
                <button
                  type="button"
                  onClick={() => onRemoveUrl(url)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-all cursor-pointer z-10"
                  title="Xóa tệp này"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render Single Post Card
  const renderPostCard = (post: PostItem, isPopup = false) => {
    const isLiked = post.likedBy.includes(myIdentifier);
    const likeCount = post.likedBy.length;
    const commentsCount = post.comments.length;
    const showComments = activeCommentPostId === post.id || isPopup;

    const isAuthor =
      (post.authorUsername && post.authorUsername === currentStudent.username) ||
      (post.authorName && post.authorName === currentStudent.displayName) ||
      (currentStudent.displayName && post.authorName.toLowerCase() === currentStudent.displayName.toLowerCase());

    return (
      <div
        key={post.id}
        className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 sm:space-y-4"
      >
        {/* Author Info Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSelectedStudent({
                  displayName: post.authorName,
                  username: post.authorUsername,
                  studentClass: post.authorClass,
                  avatarUrl: post.authorAvatar,
                })
              }
              className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm border border-blue-200 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer overflow-hidden shrink-0 shadow-2xs"
              title="Xem hồ sơ thí sinh"
            >
              {post.authorAvatar ? (
                <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
              ) : (
                post.authorName.charAt(0).toUpperCase()
              )}
            </button>
            <div>
              <button
                type="button"
                onClick={() =>
                  setSelectedStudent({
                    displayName: post.authorName,
                    username: post.authorUsername,
                    studentClass: post.authorClass,
                    avatarUrl: post.authorAvatar,
                  })
                }
                className="font-bold text-slate-900 text-xs sm:text-sm hover:underline hover:text-blue-600 text-left cursor-pointer flex items-center gap-1.5"
              >
                <span>{post.authorName}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
              </button>
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1.5 sm:gap-2">
                <span>{post.authorClass || "Học sinh"}</span>
                <span>•</span>
                <span>{formatDate(post.createdAt, true)}</span>
              </div>
            </div>
          </div>

          {/* Author Actions (Edit / Delete Post) */}
          {isAuthor && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditingPostId(post.id);
                  setEditingPostText(post.text);
                  setEditingPostFiles(
                    post.fileUrls && post.fileUrls.length > 0
                      ? post.fileUrls
                      : post.imageUrl
                      ? [post.imageUrl]
                      : []
                  );
                }}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Sửa bài viết"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmTarget({ type: "post", post });
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Xóa bài viết"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content Text / Edit Mode */}
        {editingPostId === post.id ? (
          <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <textarea
              rows={3}
              value={editingPostText}
              onChange={(e) => setEditingPostText(e.target.value)}
              placeholder="Nội dung bài viết..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Editing Attached Files */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">Tệp đính kèm bài viết:</span>
              {renderAttachments(editingPostFiles, undefined, (urlToRemove) => {
                setEditingPostFiles((prev) => prev.filter((u) => u !== urlToRemove));
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <input
                type="file"
                multiple
                ref={editPostFileInputRef}
                onChange={handleEditPostFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
              <button
                type="button"
                onClick={() => editPostFileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
              >
                {isUploadingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>Thêm tệp</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPostId(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditPost(post.id)}
                  disabled={isUploadingFile}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Lưu sửa
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-slate-800 font-normal leading-relaxed whitespace-pre-wrap">
              {post.text}
            </p>
            {renderAttachments(post.fileUrls, post.imageUrl)}
          </>
        )}

        {/* Post Actions (Like, Comment counter, Share) */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => handleToggleLike(post)}
              className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                isLiked ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-600 text-rose-600" : ""}`} />
              <span>{likeCount > 0 ? likeCount : "Yêu thích"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCommentPostId(showComments && !isPopup ? null : post.id)}
              className="flex items-center gap-1.5 font-bold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span>{commentsCount > 0 ? `${commentsCount} bình luận` : "Bình luận"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSharePost(post.id)}
            className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            title="Chia sẻ bài viết"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Chia sẻ</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
            {/* List of existing comments */}
            {post.comments.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {post.comments.map((cm) => {
                  const isCmAuthor =
                    (cm.authorUsername && cm.authorUsername === currentStudent.username) ||
                    (cm.authorName && cm.authorName === currentStudent.displayName) ||
                    (currentStudent.displayName &&
                      cm.authorName.toLowerCase() === currentStudent.displayName.toLowerCase());

                  const hasReplies = cm.replies && cm.replies.length > 0;
                  const isRepliesExpanded = !!expandedReplyCommentIds[cm.id];

                  return (
                    <div key={cm.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] overflow-hidden shrink-0 border border-slate-200">
                            {cm.authorAvatar ? (
                              <img src={cm.authorAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              cm.authorName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedStudent({
                                displayName: cm.authorName,
                                username: cm.authorUsername,
                                studentClass: cm.authorClass,
                                avatarUrl: cm.authorAvatar,
                              })
                            }
                            className="font-bold text-slate-900 hover:underline hover:text-blue-600 cursor-pointer text-left truncate"
                          >
                            {cm.authorName}{" "}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({cm.authorClass || "Thí sinh"})
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 shrink-0">{formatDate(cm.createdAt)}</span>
                          {isCmAuthor && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingComment({
                                    postId: post.id,
                                    commentId: cm.id,
                                    text: cm.text,
                                    fileUrls: cm.fileUrls || [],
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                title="Sửa bình luận"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmTarget({ type: "comment", post, commentId: cm.id });
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                                title="Xóa bình luận"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Edit Comment Mode */}
                      {editingComment?.commentId === cm.id ? (
                        <div className="space-y-2 pl-2 sm:pl-8 p-2 bg-white rounded-xl border border-slate-200">
                          <input
                            type="text"
                            value={editingComment.text}
                            onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                            placeholder="Nội dung bình luận..."
                          />

                          {/* Attached files in edit comment */}
                          {renderAttachments(editingComment.fileUrls, undefined, (urlToRemove) => {
                            setEditingComment((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    fileUrls: prev.fileUrls.filter((u) => u !== urlToRemove),
                                  }
                                : null
                            );
                          })}

                          <div className="flex items-center justify-between pt-1">
                            <input
                              type="file"
                              multiple
                              ref={editCommentFileInputRef}
                              onChange={(e) => handleEditCommentFileUpload(e.target.files)}
                              className="hidden"
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            />
                            <button
                              type="button"
                              onClick={() => editCommentFileInputRef.current?.click()}
                              disabled={isUploadingFile}
                              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              <Paperclip className="w-3 h-3" /> Thêm tệp
                            </button>

                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingComment(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditComment(post)}
                                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Lưu
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="pl-2 sm:pl-8 space-y-1">
                          <p className="text-slate-800 font-medium leading-relaxed">{cm.text}</p>
                          {renderAttachments(cm.fileUrls)}
                        </div>
                      )}

                      {/* Comment Actions (Reply / Toggle replies) */}
                      <div className="flex items-center gap-3 pl-2 sm:pl-8 pt-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReplyCommentId(activeReplyCommentId === cm.id ? null : cm.id)
                          }
                          className="font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <CornerDownRight className="w-3 h-3" /> Phản hồi
                        </button>

                        {hasReplies && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedReplyCommentIds((prev) => ({
                                ...prev,
                                [cm.id]: !prev[cm.id],
                              }))
                            }
                            className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                          >
                            {isRepliesExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" /> Thu gọn phản hồi
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" /> Xem {cm.replies?.length} phản hồi
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Reply Input Box */}
                      {activeReplyCommentId === cm.id && (
                        <div className="pl-2 sm:pl-8 pt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={`Phản hồi ${cm.authorName}...`}
                            value={replyInputs[cm.id] || ""}
                            onChange={(e) =>
                              setReplyInputs({ ...replyInputs, [cm.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddReply(post, cm.id);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddReply(post, cm.id)}
                            disabled={!replyInputs[cm.id]?.trim()}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Nested Replies List */}
                      {hasReplies && isRepliesExpanded && (
                        <div className="pl-2 sm:pl-8 space-y-2 pt-2 border-l-2 border-blue-200 ml-2">
                          {cm.replies?.map((rp) => (
                            <div key={rp.id} className="p-2 bg-white rounded-xl border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-[11px]">
                                  {rp.authorName}{" "}
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({rp.authorClass || "Thí sinh"})
                                  </span>
                                </span>
                                <span className="text-[10px] text-slate-400">{formatDate(rp.createdAt)}</span>
                              </div>
                              <p className="text-slate-700 text-[11px] font-medium leading-relaxed">
                                {rp.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comment Input Box with File Attachment */}
            <div className="space-y-2">
              {/* Comment Files Preview */}
              {commentFiles[post.id] && commentFiles[post.id].length > 0 && (
                <div className="pl-2">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">Tệp đính kèm bình luận:</span>
                  {renderAttachments(commentFiles[post.id], undefined, (urlToRemove) => {
                    setCommentFiles((prev) => ({
                      ...prev,
                      [post.id]: (prev[post.id] || []).filter((u) => u !== urlToRemove),
                    }));
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold hidden xs:flex items-center justify-center text-[11px] overflow-hidden shrink-0 border border-slate-200">
                  {currentStudent.avatarUrl ? (
                    <img src={currentStudent.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentStudent.displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <input
                  type="text"
                  value={commentInputs[post.id] || ""}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddComment(post.id);
                    }
                  }}
                  placeholder="Viết bình luận của bạn..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />

                <input
                  type="file"
                  multiple
                  ref={commentFileInputRef}
                  onChange={(e) => handleCommentFileUpload(post.id, e.target.files)}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <button
                  type="button"
                  onClick={() => commentFileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  title="Đính kèm file vào bình luận"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleAddComment(post.id)}
                  disabled={(!commentInputs[post.id]?.trim() && (!commentFiles[post.id] || commentFiles[post.id].length === 0)) || isUploadingFile}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 py-4 pb-16">
      {/* Shared Post Popup Modal if accessed via share URL */}
      {sharedPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-100 border border-slate-200 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Bài viết được chia sẻ
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Từ góc trao đổi cộng đồng DkTEST
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSharedPost(null);
                  setSearchParams({});
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderPostCard(sharedPost, true)}
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-blue-100 text-[11px] font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> Cộng đồng Thí sinh DkTEST
          </span>
          <h2 className="text-lg sm:text-2xl font-black tracking-tight">Góc Trao Đổi & Chia Sẻ Kinh Nghiệm</h2>
          <p className="text-xs text-blue-100/90 font-medium max-w-md">
            Hỏi đáp bài tập, trao đổi mẹo ôn thi, giao lưu bạn bè và khoe điểm số xuất sắc của bạn!
          </p>
        </div>
      </div>

      {/* Post Creator Box */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0 overflow-hidden border border-blue-200">
            {currentStudent.avatarUrl ? (
              <img src={currentStudent.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              currentStudent.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              rows={3}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={`Bạn muốn trao đổi gì hôm nay, ${currentStudent.displayName}?`}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />

            {/* Render Multiple Post Files Preview */}
            {renderAttachments(postFiles, undefined, (urlToRemove) => {
              setPostFiles((prev) => prev.filter((u) => u !== urlToRemove));
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <input
            type="file"
            multiple
            ref={postFileInputRef}
            onChange={handlePostFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <button
            type="button"
            onClick={() => postFileInputRef.current?.click()}
            disabled={isUploadingFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploadingFile ? (
              <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4 text-emerald-500" />
            )}
            <span>Đính kèm file ({postFiles.length})</span>
          </button>

          <button
            type="button"
            onClick={handleCreatePost}
            disabled={( !postText.trim() && postFiles.length === 0 ) || isSubmittingPost || isUploadingFile}
            className="px-4 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSubmittingPost ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Đăng bài</span>
          </button>
        </div>
      </div>

      {/* Feed Posts List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500">Đang tải bảng tin cộng đồng...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-200 space-y-2">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">Chưa có bài đăng nào</h4>
          <p className="text-xs text-slate-400">Hãy là người đầu tiên đăng bài giao lưu cùng cộng đồng DkTEST!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => renderPostCard(post))}

          {/* Load More Button for Read Optimization */}
          {hasMorePosts && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setPostsLimit((prev) => prev + 10)}
                className="px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
              >
                Tải thêm bài viết...
              </button>
            </div>
          )}
        </div>
      )}

      {/* Public Student Profile Modal */}
      <PublicStudentProfileModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
      />

      {/* Confirmation Modal for Post or Comment Deletion */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        onClose={() => setDeleteConfirmTarget(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title={deleteConfirmTarget?.type === "post" ? "Xóa bài viết" : "Xóa bình luận"}
        message={
          deleteConfirmTarget?.type === "post"
            ? "Bạn có chắc chắn muốn xóa bài viết này khỏi cộng đồng không? Hành động này không thể hoàn tác."
            : "Bạn có chắc chắn muốn xóa bình luận này không?"
        }
        confirmText="Xóa ngay"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
}
