import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { formatDate } from "../../utils/date";
import PublicStudentProfileModal, { StudentPublicData } from "../../components/student/PublicStudentProfileModal";
import { uploadFileToCloudinary } from "../../services/cloudinary";
import { useToast } from "../../components/ui/ToastNotification";

export interface CommentItem {
  id: string;
  authorName: string;
  authorUsername?: string;
  authorClass?: string;
  authorAvatar?: string;
  text: string;
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
  likedBy: string[];
  comments: CommentItem[];
  createdAt: any;
}

export default function Community() {
  const navigate = useNavigate();
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New post state
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Comment input state keyed by post.id
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

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
      } catch (e) {}
    }
  }, []);

  // Realtime Firestore feed listener
  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    if (!role) {
      navigate("/student/login", { replace: true });
      return;
    }

    setLoading(true);
    const q = query(collection(db, "community_posts"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: PostItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorName: data.authorName || "Thí sinh",
            authorUsername: data.authorUsername || "student",
            authorClass: data.authorClass || "Học sinh",
            authorAvatar: data.authorAvatar || "",
            text: data.text || "",
            imageUrl: data.imageUrl || "",
            likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
            comments: Array.isArray(data.comments)
              ? data.comments.map((cm: any) => ({
                  id: cm.id || Math.random().toString(),
                  authorName: cm.authorName || "Thí sinh",
                  authorUsername: cm.authorUsername || "student",
                  authorClass: cm.authorClass || "Học sinh",
                  authorAvatar: cm.authorAvatar || "",
                  text: cm.text || "",
                  createdAt: cm.createdAt,
                }))
              : [],
            createdAt: data.createdAt,
          };
        });
        setPosts(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to community posts:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [navigate]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const url = await uploadFileToCloudinary(file);
      setPostImage(url);
      showSuccessToast("Tải tệp đính kèm thành công!");
    } catch (err) {
      showErrorToast("Lỗi tải lên đính kèm. Vui lòng thử lại.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !postImage) return;

    setIsSubmittingPost(true);
    try {
      await addDoc(collection(db, "community_posts"), {
        authorName: currentStudent.displayName,
        authorUsername: currentStudent.username,
        authorClass: currentStudent.studentClass,
        authorAvatar: currentStudent.avatarUrl || "",
        text: postText.trim(),
        imageUrl: postImage.trim(),
        likedBy: [],
        comments: [],
        createdAt: serverTimestamp(),
      });

      setPostText("");
      setPostImage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      showSuccessToast("Đã chia sẻ bài viết lên cộng đồng!");
    } catch (err) {
      console.error("Lỗi khi đăng bài:", err);
      showErrorToast("Không thể đăng bài. Vui lòng thử lại!");
    } finally {
      setIsSubmittingPost(false);
    }
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
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    const postRef = doc(db, "community_posts", postId);
    const newComment: CommentItem = {
      id: "cm_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      authorName: currentStudent.displayName,
      authorUsername: currentStudent.username,
      authorClass: currentStudent.studentClass,
      authorAvatar: currentStudent.avatarUrl || "",
      text: commentText,
      createdAt: new Date().toISOString(),
    };

    try {
      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
      });

      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Lỗi khi thêm bình luận:", err);
      showErrorToast("Không thể gửi bình luận!");
    }
  };

  const myIdentifier = currentStudent.username || currentStudent.displayName;

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 py-4 pb-16">
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

      {/* Post Creator Box with Avatar */}
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

            {postImage && (
              <div className="relative inline-block mt-2 animate-in fade-in duration-200">
                {postImage.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                  <img src={postImage} alt="Đính kèm" className="h-24 rounded-xl border border-slate-200 object-cover" />
                ) : (
                  <a
                    href={postImage}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-blue-600"
                  >
                    <Paperclip className="w-4 h-4" /> Xem đính kèm
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPostImage("")}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-200 shadow-xs cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploadingFile ? <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" /> : <Paperclip className="w-4 h-4 text-emerald-500" />}
            <span>Đính kèm file</span>
          </button>

          <button
            type="button"
            onClick={handleCreatePost}
            disabled={(!postText.trim() && !postImage) || isSubmittingPost || isUploadingFile}
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
          {posts.map((post) => {
            const isLiked = post.likedBy.includes(myIdentifier);
            const likeCount = post.likedBy.length;
            const commentsCount = post.comments.length;
            const showComments = activeCommentPostId === post.id;

            return (
              <div key={post.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
                {/* Author Info Header with Avatar */}
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
                </div>

                {/* Content Text */}
                <p className="text-xs sm:text-sm text-slate-800 font-normal leading-relaxed whitespace-pre-wrap">
                  {post.text}
                </p>

                {/* Optional Attached File/Image */}
                {post.imageUrl && (
                  <div className="mt-2">
                    {post.imageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-96 bg-slate-900 flex items-center justify-center">
                        <img src={post.imageUrl} alt="Post content" className="w-full max-h-96 object-contain" />
                      </div>
                    ) : (
                      <a
                        href={post.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors text-blue-700 font-bold text-xs shadow-xs w-full sm:w-auto"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                          <Paperclip className="w-4 h-4 text-white" />
                        </div>
                        <span className="flex-1 truncate text-left">Tệp đính kèm được chia sẻ</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-blue-200 ml-2 shrink-0">Tải xuống/Xem</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Post Actions (Like, Comment counter) */}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post)}
                      className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isLiked
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-600 text-rose-600" : ""}`} />
                      <span>{likeCount > 0 ? likeCount : "Yêu thích"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCommentPostId(showComments ? null : post.id)}
                      className="flex items-center gap-1.5 font-bold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span>{commentsCount > 0 ? `${commentsCount} bình luận` : "Bình luận"}</span>
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                {showComments && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                    {/* List of existing comments with avatar */}
                    {post.comments.length > 0 && (
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {post.comments.map((cm) => (
                          <div key={cm.id} className="p-2.5 sm:p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
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
                                  {cm.authorName} <span className="text-[10px] text-slate-400 font-normal">({cm.authorClass || "Thí sinh"})</span>
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">{formatDate(cm.createdAt)}</span>
                            </div>
                            <p className="text-slate-700 font-normal pl-8">{cm.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment Input with student avatar thumbnail */}
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
                        onChange={(e) =>
                          setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        placeholder="Viết bình luận của bạn..."
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim()}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Public Student Profile Modal */}
      <PublicStudentProfileModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
      />
    </div>
  );
}
