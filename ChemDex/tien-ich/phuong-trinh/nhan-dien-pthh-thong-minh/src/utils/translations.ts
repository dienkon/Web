/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TranslationDictionary {
  appName: string;
  appDescription: string;
  languageLabel: string;
  aiService: string;
  aiConnecting: string;
  aiReady: string;
  aiOffline: string;

  // Row 1: Image container
  row1Title: string;
  row1Subtitle: string;
  dropImagePrompt: string;
  screenshotPrompt: string;
  pastePrompt: string;
  hoverPasteWarning: string;
  uploadingText: string;
  ocrProcessing: string;
  changeImage: string;
  deleteImage: string;
  invalidFileError: string;
  ocrErrorPrefix: string;

  // Row 2: Chemical Equation Input
  row2Title: string;
  row2Subtitle: string;
  row2Placeholder: string;
  btnBalance: string;
  btnBalancing: string;
  manualTitle: string;
  manualDesc: string;

  // Row 3: Balanced Equation
  row3Title: string;
  row3Subtitle: string;
  row3Confidence: string;
  row3BalancedOk: string;
  row3UnbalancedWarn: string;
  row3ReactionType: string;
  btnCopy: string;
  btnCopied: string;

  // Row 4: Detailed Analysis
  row4Title: string;
  row4Subtitle: string;
  tabMechanism: string;
  tabIonic: string;
  tabRedox: string;
  tabPractical: string;
  queryingAi: string;
  queryingAiDesc: string;
  aiVerifiedOk: string;
  noAiAnalysis: string;
  noAiAnalysisDesc: string;
  offlineFallbackActive: string;
  waitingForInput: string;
  chemistryDetailReasoning: string;
  predictedProducts: string;
  noPredictedProducts: string;

  // Row 5: Assessment & Evaluation
  row5Title: string;
  row5Subtitle: string;
  ocrMetric: string;
  repairMetric: string;
  inferenceMetric: string;
  balancingMetric: string;
  aiMetric: string;
  overallScore: string;
  correctionsLabel: string;
  rawOcrLabel: string;
  repairedLocalLabel: string;
  structuredLocalLabel: string;
  reactantsLabel: string;
  productsLabel: string;
  rateHeading: string;
  rateSubheading: string;
  likeButton: string;
  dislikeButton: string;
  dislikePlaceholder: string;
  feedbackSubmit: string;
  feedbackSubmitting: string;
  feedbackSuccess: string;
}

export const translations: Record<"vi" | "en", TranslationDictionary> = {
  vi: {
    appName: "Nhận Diện Phương Trình Hóa Học",
    appDescription: "",
    languageLabel: "Ngôn ngữ: Tiếng Việt",
    aiService: "",
    aiConnecting: "Đang kết nối...",
    aiReady: "Sẵn sàng",
    aiOffline: "Cục bộ",

    // Row 1
    row1Title: "KHUNG ẢNH",
    row1Subtitle:
      "Hỗ trợ kéo thả hoặc nhấn Ctrl+V để dán trực tiếp khi di chuột vào khung ảnh",
    dropImagePrompt: "Kéo thả ảnh hoặc click để chọn tệp",
    screenshotPrompt:
      "Hỗ trợ PNG, JPG, JPEG từ ảnh chụp màn hình hoặc điện thoại",
    pastePrompt: "Nhấn Ctrl+V để dán ảnh trực tiếp từ clipboard",
    hoverPasteWarning:
      "⚠️ Lưu ý: Chỉ khi di chuột vào khung này mới có thể nhấn Ctrl+V dán ảnh",
    uploadingText: "Đang tải tệp lên...",
    ocrProcessing: "Đang nhận diện chữ viết...",
    changeImage: "Đổi Ảnh",
    deleteImage: "Xóa Ảnh",
    invalidFileError:
      "Tệp không đúng định dạng. Vui lòng tải lên một hình ảnh.",
    ocrErrorPrefix: "Lỗi nhận diện chữ từ hình ảnh:",

    // Row 2
    row2Title: "PHƯƠNG TRÌNH",
    row2Subtitle: "",
    row2Placeholder: "Ví dụ: K2CO3 + CaCl2 -> CaCO3 + KCl",
    btnBalance: "Phân Tích & Cân Bằng Phương Trình",
    btnBalancing: "Đang xử lý hệ thống...",
    manualTitle: "Dữ liệu văn bản hóa học",
    manualDesc:
      "Đây là kết quả nhận dạng thô. Bạn có thể tự do chỉnh sửa hoặc nhập trực tiếp trước khi phân tích.",

    // Row 3
    row3Title: "PHƯƠNG TRÌNH HOÀN CHỈNH",
    row3Subtitle: "",
    row3Confidence: "",
    row3BalancedOk: "Phương trình đã được cân bằng chính xác",
    row3UnbalancedWarn: "⚠ Phương trình chưa được cân bằng hoàn toàn",
    row3ReactionType: "Loại phản ứng:",
    btnCopy: "Sao Chép Kết Quả",
    btnCopied: "Đã Sao Chép!",

    // Row 4
    row4Title: "THÔNG TIN CHI TIẾT",
    row4Subtitle: "",
    tabMechanism: "Cơ Chế & Hiện Tượng",
    tabIonic: "Phương Trình Ion",
    tabRedox: "Oxi Hóa - Khử",
    tabPractical: "Ứng Dụng & An Toàn",
    queryingAi: "Đang truy vấn...",
    queryingAiDesc:
      "Trí tuệ nhân tạo đang phân tích hóa trị, xác thực phản ứng và phân rã các cấu trúc ion hóa trị...",
    aiVerifiedOk:
      "Xác thực thành công! Gemini đã hoàn tất phân tích lý thuyết phản ứng.",
    noAiAnalysis: "Không sử dụng AI kiểm chứng",
    noAiAnalysisDesc:
      "Hệ thống đã tự động kích hoạt Cơ chế hoạt động ngoại tuyến (Offline Core). Kết quả hiển thị dựa trên thuật toán cục bộ.",
    offlineFallbackActive: "Đang hoạt động ngoại tuyến.",
    waitingForInput:
      "Vui lòng quét ảnh hoặc nhập phương trình ở dòng trên để bắt đầu phân tích AI.",
    chemistryDetailReasoning: "Lý giải chi tiết phản ứng:",
    predictedProducts: "Các sản phẩm dự đoán:",
    noPredictedProducts: "Không cần dự đoán thêm sản phẩm.",

    // Row 5
    row5Title: "ĐÁNH GIÁ KẾT QUẢ & TIẾN TRÌNH",
    row5Subtitle: "",
    ocrMetric: "Nhận diện ảnh thô",
    repairMetric: "Thuật toán sửa lỗi hóa học thô",
    inferenceMetric: "Dự đoán chất sản phẩm khuyết",
    balancingMetric: "Thuật toán cân bằng cục bộ",
    aiMetric: "Kiểm chứng AI",
    overallScore: "Độ tin cậy tổng thể",
    correctionsLabel: "Các điều chỉnh đã thực hiện:",
    rawOcrLabel: "Nhận diện ảnh thô (OCR):",
    repairedLocalLabel: "Sửa lỗi công thức hóa học đề xuất:",
    structuredLocalLabel: "Cấu trúc hóa học trích xuất:",
    reactantsLabel: "Chất tham gia",
    productsLabel: "Chất sản phẩm",
    rateHeading: "Đánh Giá Kết Quả & Góp Ý Lỗi",
    rateSubheading:
      "Phản hồi của bạn giúp AI tự động rút kinh nghiệm sâu sắc để nâng cao độ chính xác:",
    likeButton: "Hài lòng",
    dislikeButton: "Chưa đúng / Cần sửa",
    dislikePlaceholder:
      "Hãy mô tả chi tiết lỗi sai để AI ghi nhớ học hỏi (ví dụ: 'Dự đoán sai sản phẩm', 'Cân bằng sai hệ số H2O', 'Hóa trị sai'...)",
    feedbackSubmit: "Gửi ý kiến để AI học tập",
    feedbackSubmitting: "Đang truyền tải bài học...",
    feedbackSuccess:
      "Cảm ơn bạn! Ý kiến đã được ghi nhận. AI đã học hỏi lỗi sai này và rút kinh nghiệm cho các lần phân tích tiếp theo.",
  },
  en: {
    appName: "Chemical Equation Recognizer",
    appDescription: "",
    languageLabel: "Language: English",
    aiService: "",
    aiConnecting: "Connecting...",
    aiReady: "Ready",
    aiOffline: "Local",

    // Row 1
    row1Title: "IMAGE BOX",
    row1Subtitle:
      "Supports drag and drop or Ctrl+V pasting when mouse is hovering over the image frame",
    dropImagePrompt: "Drag and drop image or click to choose file",
    screenshotPrompt:
      "Supports PNG, JPG, JPEG from screenshots or phone camera",
    pastePrompt: "Press Ctrl+V to paste image directly from clipboard",
    hoverPasteWarning:
      "⚠️ Note: Ctrl+V pasting only functions when mouse is hovering over this box",
    uploadingText: "Uploading file...",
    ocrProcessing: "Recognizing text...",
    changeImage: "Change Image",
    deleteImage: "Remove Image",
    invalidFileError: "Invalid file format. Please upload an image.",
    ocrErrorPrefix: "Image recognition error:",

    // Row 2
    row2Title: "EQUATION",
    row2Subtitle: "",
    row2Placeholder: "Example: K2CO3 + CaCl2 -> CaCO3 + KCl",
    btnBalance: "Analyze & Balance Equation",
    btnBalancing: "Processing system...",
    manualTitle: "Chemical text data",
    manualDesc:
      "This is the raw recognition result. Feel free to edit or type directly here before initiating the analysis.",

    // Row 3
    row3Title: "COMPLETE EQUATION",
    row3Subtitle: "",
    row3Confidence: "",
    row3BalancedOk: "Equation has been balanced correctly",
    row3UnbalancedWarn: "⚠ Equation is not fully balanced",
    row3ReactionType: "Reaction Type:",
    btnCopy: "Copy Result",
    btnCopied: "Copied!",

    // Row 4
    row4Title: "DETAILED INFORMATION",
    row4Subtitle: "",
    tabMechanism: "Mechanism & Phenomenon",
    tabIonic: "Ionic Equation",
    tabRedox: "Oxidation - Reduction",
    tabPractical: "Applications & Safety",
    queryingAi: "Querying...",
    queryingAiDesc:
      "Artificial intelligence is analyzing valency, validating the reaction, and decomposing ionic structures...",
    aiVerifiedOk:
      "Verification successful! Gemini completed the theoretical chemical analysis.",
    noAiAnalysis: "No AI verification used",
    noAiAnalysisDesc:
      "System automatically activated the Offline Core mechanism. The output is calculated with local heuristic algorithms.",
    offlineFallbackActive: "Running offline mode.",
    waitingForInput:
      "Please scan an image or input an equation in the row above to trigger AI analysis.",
    chemistryDetailReasoning: "Detailed reaction analysis:",
    predictedProducts: "Predicted Products:",
    noPredictedProducts: "No additional products needed predicting.",

    // Row 5
    row5Title: "ASSESSMENT & PIPELINE LOGS",
    row5Subtitle: "",
    ocrMetric: "Raw image recognition",
    repairMetric: "Chemical orthography correction algorithm",
    inferenceMetric: "Missing product inference",
    balancingMetric: "Local balancing algorithm",
    aiMetric: "AI Verification",
    overallScore: "Overall Confidence Score",
    correctionsLabel: "Adjustments applied:",
    rawOcrLabel: "Raw image recognition (OCR):",
    repairedLocalLabel: "Suggested chemical orthography corrections:",
    structuredLocalLabel: "Extracted chemical structure:",
    reactantsLabel: "Reactants",
    productsLabel: "Products",
    rateHeading: "Rate This Analysis & Give Feedback",
    rateSubheading:
      "Your feedback helps the AI automatically learn and draw deep experience to prevent repeating mistakes:",
    likeButton: "Helpful / Correct",
    dislikeButton: "Incorrect / Needs Fixing",
    dislikePlaceholder:
      "Describe the specific error so the AI can record and learn from it (e.g., 'Predicted wrong products', 'Incorrect balancing coefficient', 'Invalid valency'...)",
    feedbackSubmit: "Submit and Teach AI",
    feedbackSubmitting: "Teaching AI...",
    feedbackSuccess:
      "Thank you! Your feedback has been recorded. AI has learned from this mistake and will improve in future analysis.",
  },
};
