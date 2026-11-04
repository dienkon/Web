# -*- coding: utf-8 -*-
"""
Generator script for V-ACT Study Tracker
Creates index.html as a self-contained, high-performance, single-file application.
"""

import json

def get_topics_data():
    return [
        # --- TIẾNG VIỆT (vietnamese) ---
        # A. Kiến thức tiếng Việt
        {"id": "top_tv_01", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Chính tả", "description": "Quy tắc chính tả, phân biệt phụ âm đầu, vần, thanh điệu, từ Hán-Việt dễ lẫn.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_02", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Từ vựng và ngữ nghĩa", "description": "Nghĩa của từ, từ đồng nghĩa, trái nghĩa, từ nhiều nghĩa, từ tượng hình, tượng thanh.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_03", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Ngữ pháp tiếng Việt", "description": "Từ loại (danh, động, tính, số, lượng, phó, đại, quan hệ từ), cụm từ chính phụ, đẳng lập.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_tv_04", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Thành phần câu", "description": "Thành phần chính (CN, VN), phụ (trạng ngữ, khởi ngữ), biệt lập (tình thái, cảm thán, gọi đáp, phụ chú).", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_05", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Liên kết câu và đoạn văn", "description": "Liên kết nội dung (chủ đề, logic), liên kết hình thức (phép lặp, phép nối, phép thế, phép liên tưởng).", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_06", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Phong cách ngôn ngữ", "description": "6 phong cách ngôn ngữ: sinh hoạt, nghệ thuật, báo chí, chính luận, khoa học, hành chính.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_tv_07", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Biện pháp tu từ", "description": "So sánh, ẩn dụ, hoán dụ, nhân hóa, điệp từ/ngữ, nói quá, nói giảm nói tránh, chơi chữ, tương phản.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_tv_08", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Hoạt động giao tiếp", "description": "Nhân vật giao tiếp, ngữ cảnh, nội dung và mục đích giao tiếp, phương châm hội thoại.", "masteryLevel": 3, "status": "in_progress", "priority": "low"},
        {"id": "top_tv_09", "subjectId": "vietnamese", "groupName": "Kiến thức tiếng Việt", "name": "Phát hiện và sửa lỗi diễn đạt", "description": "Lỗi dùng từ sai nghĩa, lỗi ngữ pháp câu (thiếu CN/VN), lỗi logic, lỗi phong cách.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},

        # B. Văn học
        {"id": "top_tv_10", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Văn học dân gian", "description": "Ca dao, tục ngữ, truyện cười, thần thoại, truyền thuyết, sử thi, cổ tích.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_11", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Văn học trung đại", "description": "Tác phẩm trung đại thế kỷ X - XIX: Nguyễn Trãi, Nguyễn Du (Truyện Kiều), Hồ Xuân Hương...", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_tv_12", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Văn học hiện đại", "description": "Văn học 1930 - 1945 và 1945 - hết thế kỷ XX: Thơ mới, văn xuôi hiện thực, văn học kháng chiến.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_13", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Thơ", "description": "Thể thơ, vần, nhịp điệu, hình tượng thơ, cảm xúc chủ đạo, phân tích thơ.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_14", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Truyện ngắn và tiểu thuyết", "description": "Cốt truyện, tình huống truyện, nhân vật, điểm nhìn trần thuật, ngôn ngữ nhân vật.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_15", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Kịch", "description": "Xung đột kịch, hành động kịch, ngôn ngữ đối thoại, độc thoại nội tâm (Vũ Như Tô, Hồn Trương Ba...).", "masteryLevel": 2, "status": "not_started", "priority": "low"},
        {"id": "top_tv_16", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Ký, tùy bút và tản văn", "description": "Cái tôi trữ tình, tính xác thực của sự kiện, tài hoa nghệ sĩ (Người lái đò Sông Đà, Ai đã đặt tên cho dòng sông...).", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_17", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Kiến thức tác giả, tác phẩm", "description": "Tiểu sử tác giả lớn, hoàn cảnh sáng tác, phong cách sáng tác, vị trí văn học sử.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_18", "subjectId": "vietnamese", "groupName": "Văn học", "name": "Phân tích nội dung và nghệ thuật", "description": "Chủ đề, tư tưởng thông điệp, giá trị nhân đạo, giá trị hiện thực, đặc sắc nghệ thuật.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},

        # C. Đọc hiểu
        {"id": "top_tv_19", "subjectId": "vietnamese", "groupName": "Đọc hiểu", "name": "Đọc hiểu văn bản văn học", "description": "Ngữ liệu thơ ca, truyện, kịch, cảm thụ thẩm mỹ và chi tiết nghệ thuật tiêu biểu.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_tv_20", "subjectId": "vietnamese", "groupName": "Đọc hiểu", "name": "Đọc hiểu nghị luận xã hội", "description": "Vấn đề tư tưởng đạo lý, lối sống, hiện tượng đời sống, thông điệp rút ra.", "masteryLevel": 4, "status": "mastered", "priority": "medium"},
        {"id": "top_tv_21", "subjectId": "vietnamese", "groupName": "Đọc hiểu", "name": "Đọc hiểu nghị luận văn học", "description": "Tiếp nhận ý kiến phê bình, lý luận văn học, trích đoạn bài viết văn học.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_tv_22", "subjectId": "vietnamese", "groupName": "Đọc hiểu", "name": "Đọc hiểu văn bản thông tin", "description": "Văn bản khoa học, báo chí, thuyết minh, cấu trúc thông tin và tính xác thực.", "masteryLevel": 4, "status": "mastered", "priority": "medium"},
        {"id": "top_tv_23", "subjectId": "vietnamese", "groupName": "Đọc hiểu", "name": "Xác định ý chính", "description": "Kỹ thuật tóm tắt ý chính của từng đoạn và toàn văn bản, nhận diện luận đề.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_tv_24", "subjectId": "vietnamese", "groupName": "Đọc hiểu", "name": "Suy luận và rút ra kết luận", "description": "Đọc giữa các dòng, suy ý ngầm, ngụ ý của tác giả qua câu chữ ngữ cảnh.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_tv_25", "subjectId": "vietnamese", "groupName": "Đọc hiểu", "name": "Phân tích quan điểm tác giả", "description": "Thái độ, tình cảm, lập trường của người viết đối với hiện tượng hay vấn đề đặt ra.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},

        # --- TIẾNG ANH (english) ---
        # A. Grammar
        {"id": "top_en_01", "subjectId": "english", "groupName": "Grammar", "name": "Tenses", "description": "Present, past, future tenses; simple, continuous, perfect, perfect continuous and tense agreement.", "masteryLevel": 4, "status": "mastered", "priority": "medium"},
        {"id": "top_en_02", "subjectId": "english", "groupName": "Grammar", "name": "Parts of Speech", "description": "Nouns, pronouns, verbs, adjectives, adverbs, articles, determiners.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_en_03", "subjectId": "english", "groupName": "Grammar", "name": "Subject–Verb Agreement", "description": "Singular/plural subjects, collective nouns, neither/either, along with, quantities.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_en_04", "subjectId": "english", "groupName": "Grammar", "name": "Relative Clauses", "description": "Defining/non-defining clauses, relative pronouns, reduced relative clauses with V-ing/V-ed/to-V.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_en_05", "subjectId": "english", "groupName": "Grammar", "name": "Conditional Sentences", "description": "Type 0, 1, 2, 3, mixed conditionals, inversion of conditionals, wish/if only, unless, provided that.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_en_06", "subjectId": "english", "groupName": "Grammar", "name": "Passive Voice", "description": "Basic and advanced passive patterns, passive with reporting verbs, causative form have/get.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_en_07", "subjectId": "english", "groupName": "Grammar", "name": "Reported Speech", "description": "Statements, questions, commands, reporting verbs with gerunds/infinitives, subjunctive shifts.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_en_08", "subjectId": "english", "groupName": "Grammar", "name": "Comparisons", "description": "Equal, comparative, superlative, double comparative (the more... the more...), multiple numbers.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_en_09", "subjectId": "english", "groupName": "Grammar", "name": "Conjunctions and Prepositions", "description": "Coordinating, subordinating conjunctions; despite/although, because/because of, prepositions of time/place.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_en_10", "subjectId": "english", "groupName": "Grammar", "name": "Complex and Compound Sentences", "description": "Sentence types, clauses of purpose, result, concession, inversion patterns.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},

        # B. Vocabulary
        {"id": "top_en_11", "subjectId": "english", "groupName": "Vocabulary", "name": "Vocabulary in Context", "description": "Deducing meanings of high-level academic and daily vocabulary from context clues.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_en_12", "subjectId": "english", "groupName": "Vocabulary", "name": "Word Forms", "description": "Prefixes, suffixes, noun/verb/adj/adv transformations and semantic changes.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_en_13", "subjectId": "english", "groupName": "Vocabulary", "name": "Collocations", "description": "Fixed word combinations (make a decision, pay attention, take advantage of, heavy rain...).", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_en_14", "subjectId": "english", "groupName": "Vocabulary", "name": "Synonyms and Antonyms", "description": "Close in meaning vs opposite in meaning questions with context sensitivity.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_en_15", "subjectId": "english", "groupName": "Vocabulary", "name": "Phrasal Verbs", "description": "Common multi-word verbs with take, give, get, look, turn, put, call, carry, bring...", "masteryLevel": 2, "status": "needs_review", "priority": "high"},

        # C. Reading and Language Use
        {"id": "top_en_16", "subjectId": "english", "groupName": "Reading and Language Use", "name": "Cloze Test", "description": "Gap filling passages testing lexical and grammatical cohesion.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_en_17", "subjectId": "english", "groupName": "Reading and Language Use", "name": "Error Identification", "description": "Finding grammar, vocabulary, or parallel structure mistakes in sentences.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_en_18", "subjectId": "english", "groupName": "Reading and Language Use", "name": "Sentence Equivalence", "description": "Paraphrasing sentences using different structures while preserving meaning.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_en_19", "subjectId": "english", "groupName": "Reading and Language Use", "name": "Reading Comprehension", "description": "Passage reading skills: skimming for gist, scanning for specific details.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_en_20", "subjectId": "english", "groupName": "Reading and Language Use", "name": "Main Idea", "description": "Identifying the central theme, primary purpose, or best title for an article.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_en_21", "subjectId": "english", "groupName": "Reading and Language Use", "name": "Inference Questions", "description": "Inferring implicit meanings, facts, tone, or attitudes not stated explicitly.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_en_22", "subjectId": "english", "groupName": "Reading and Language Use", "name": "Reference Questions", "description": "Identifying what pronouns (it, they, this, which) refer to in text.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_en_23", "subjectId": "english", "groupName": "Reading and Language Use", "name": "Detailed Information", "description": "Locating true/false facts, not-mentioned items, and specific supporting details.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},

        # --- TOÁN HỌC (math) ---
        # A. Đại số
        {"id": "top_ma_01", "subjectId": "math", "groupName": "Đại số", "name": "Phương trình và bất phương trình", "description": "Bậc nhất, bậc hai, phân thức, chứa căn, chứa dấu giá trị tuyệt đối, mũ và logarit.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_02", "subjectId": "math", "groupName": "Đại số", "name": "Hệ phương trình", "description": "Hệ phương trình đại số, hệ bậc nhất nhiều ẩn, hệ đối xứng, hệ đẳng cấp, phương pháp thế và cộng.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_03", "subjectId": "math", "groupName": "Đại số", "name": "Hàm số", "description": "Tập xác định, tập giá trị, hàm chẵn lẻ, hàm tuần hoàn, hàm ngược, phép biến đổi đồ thị.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_04", "subjectId": "math", "groupName": "Đại số", "name": "Dãy số", "description": "Dãy số tăng giảm, bị chặn, công thức tổng quát, dãy truy hồi tuyến tính.", "masteryLevel": 2, "status": "needs_review", "priority": "medium"},
        {"id": "top_ma_05", "subjectId": "math", "groupName": "Đại số", "name": "Cấp số cộng và cấp số nhân", "description": "Số hạng tổng quát, tính chất, tổng n số hạng đầu, bài toán ứng dụng thực tế.", "masteryLevel": 4, "status": "mastered", "priority": "low"},

        # B. Giải tích
        {"id": "top_ma_06", "subjectId": "math", "groupName": "Giải tích", "name": "Giới hạn", "description": "Giới hạn dãy số, giới hạn hàm số tại một điểm, vô cực, dạng vô định 0/0, inf/inf.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_07", "subjectId": "math", "groupName": "Giải tích", "name": "Hàm số liên tục", "description": "Định nghĩa tính liên tục tại điểm, trên khoảng, định lý giá trị trung gian và ứng dụng nghiệm.", "masteryLevel": 3, "status": "in_progress", "priority": "low"},
        {"id": "top_ma_08", "subjectId": "math", "groupName": "Giải tích", "name": "Đạo hàm", "description": "Quy tắc tính đạo hàm, đạo hàm hàm hợp, vi phân, ý nghĩa hình học và tiếp tuyến.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_09", "subjectId": "math", "groupName": "Giải tích", "name": "Cực trị hàm số", "description": "Điều kiện cần và đủ để hàm có cực trị, cực đại, cực tiểu, tham số m để có cực trị.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_ma_10", "subjectId": "math", "groupName": "Giải tích", "name": "Tính đơn điệu", "description": "Xét dấu đạo hàm y', khoảng đồng biến nghịch biến của đa thức, phân thức, hàm hợp.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_11", "subjectId": "math", "groupName": "Giải tích", "name": "Tiệm cận", "description": "Tiệm cận đứng, tiệm cận ngang, tiệm cận xiên của đồ thị hàm phân thức hữu tỉ.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_ma_12", "subjectId": "math", "groupName": "Giải tích", "name": "Khảo sát và đồ thị hàm số", "description": "Đọc bảng biến thiên, nhận dạng đồ thị hàm bậc 3, bậc 4 trùng phương, phân thức bậc nhất.", "masteryLevel": 4, "status": "mastered", "priority": "medium"},

        # C. Xác suất và tổ hợp
        {"id": "top_ma_13", "subjectId": "math", "groupName": "Xác suất và tổ hợp", "name": "Quy tắc đếm", "description": "Quy tắc cộng, quy tắc nhân, sơ đồ cây, bài toán đếm chữ số, đếm phương án.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_14", "subjectId": "math", "groupName": "Xác suất và tổ hợp", "name": "Hoán vị, chỉnh hợp, tổ hợp", "description": "Phân biệt Pn, An^k, Cn^k; bài toán chọn người, xếp hàng, chọn vật phẩm có thứ tự hay không.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_ma_15", "subjectId": "math", "groupName": "Xác suất và tổ hợp", "name": "Xác suất", "description": "Biến cố, không gian mẫu, xác suất cổ điển, biến cố độc lập, quy tắc cộng nhân xác suất.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_ma_16", "subjectId": "math", "groupName": "Xác suất và tổ hợp", "name": "Bài toán xác suất thực tế", "description": "Rút thăm có hoàn lại và không hoàn lại, bắn bia, kiểm định chất lượng, xác suất có điều kiện.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},

        # D. Hình học
        {"id": "top_ma_17", "subjectId": "math", "groupName": "Hình học", "name": "Hình học phẳng", "description": "Hệ thức lượng trong tam giác, đường tròn, định lý sin, cos, diện tích, góc.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_18", "subjectId": "math", "groupName": "Hình học", "name": "Hình học không gian", "description": "Quan hệ song song, vuông góc, góc giữa đường và mặt, góc nhị diện, khoảng cách, thể tích khối chóp lăng trụ.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_ma_19", "subjectId": "math", "groupName": "Hình học", "name": "Phương pháp tọa độ Oxy", "description": "Điểm, vectơ, phương trình đường thẳng, đường tròn, elip, khoảng cách và góc trong Oxy.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_20", "subjectId": "math", "groupName": "Hình học", "name": "Phương pháp tọa độ Oxyz", "description": "Hệ tọa độ Oxyz, phương trình mặt phẳng, đường thẳng, mặt cầu, góc và khoảng cách.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_21", "subjectId": "math", "groupName": "Hình học", "name": "Vector và ứng dụng", "description": "Phép toán vector, tích vô hướng, ứng dụng chứng minh hình học và giải bài toán cực trị.", "masteryLevel": 3, "status": "in_progress", "priority": "low"},

        # E. Toán ứng dụng
        {"id": "top_ma_22", "subjectId": "math", "groupName": "Toán ứng dụng", "name": "Mô hình hóa bài toán thực tế", "description": "Bài toán lãi suất, bài toán tăng trưởng dân số, phân rã phóng xạ, mô hình hình học thực tế.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_ma_23", "subjectId": "math", "groupName": "Toán ứng dụng", "name": "Tối ưu hóa", "description": "Tìm min/max chi phí, thể tích lớn nhất, diện tích lớn nhất, quãng đường ngắn nhất.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_ma_24", "subjectId": "math", "groupName": "Toán ứng dụng", "name": "Phân tích dữ liệu toán học", "description": "Số đặc trưng đo xu thế trung tâm (số trung bình, trung vị, mốt), đo độ phân tán (phương sai, độ lệch chuẩn).", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},

        # --- TƯ DUY KHOA HỌC (science) ---
        # A. Logic
        {"id": "top_sc_01", "subjectId": "science", "groupName": "Logic", "name": "Logic cơ bản", "description": "Mệnh đề, mệnh đề phủ định, tuyển, hội, mệnh đề kéo theo (Nếu P thì Q) và phản đảo.", "masteryLevel": 4, "status": "mastered", "priority": "medium"},
        {"id": "top_sc_02", "subjectId": "science", "groupName": "Logic", "name": "Suy luận điều kiện", "description": "Điều kiện cần, điều kiện đủ, suy diễn hợp logic, ngụy biện phổ biến trong suy luận.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},
        {"id": "top_sc_03", "subjectId": "science", "groupName": "Logic", "name": "Quy luật và quy tắc", "description": "Tìm quy luật dãy hình, quy tắc mã hóa ký tự, quan hệ ma trận logic.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_04", "subjectId": "science", "groupName": "Logic", "name": "Sắp xếp và phân nhóm", "description": "Bài toán sắp xếp vị trí (hàng ngang, bàn tròn), phân nhóm đối tượng thỏa mãn ràng buộc.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_sc_05", "subjectId": "science", "groupName": "Logic", "name": "Logic tình huống", "description": "Giải quyết tình huống nhiều giả định, bài toán ai nói thật ai nói dối.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_sc_06", "subjectId": "science", "groupName": "Logic", "name": "Suy luận loại trừ", "description": "Kỹ thuật lập bảng chân trị, ma trận đối chiếu để loại trừ phương án sai nhanh chóng.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},

        # B. Phân tích số liệu
        {"id": "top_sc_07", "subjectId": "science", "groupName": "Phân tích số liệu", "name": "Bảng số liệu", "description": "Đọc bảng số liệu kinh tế, xã hội, khoa học; tính tỷ lệ tăng trưởng, tỷ trọng, chênh lệch.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_sc_08", "subjectId": "science", "groupName": "Phân tích số liệu", "name": "Biểu đồ cột", "description": "Biểu đồ cột đơn, cột đôi, cột chồng; so sánh quy mô và biến động các đại lượng.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_sc_09", "subjectId": "science", "groupName": "Phân tích số liệu", "name": "Biểu đồ tròn", "description": "Phân tích cơ cấu, chuyển dịch cơ cấu qua các năm, tính toán quy mô tuyệt đối từ góc độ bán kính.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_sc_10", "subjectId": "science", "groupName": "Phân tích số liệu", "name": "Biểu đồ đường", "description": "Xu hướng biến động theo thời gian, tốc độ tăng trưởng, điểm uốn và chu kỳ dao động.", "masteryLevel": 4, "status": "mastered", "priority": "low"},
        {"id": "top_sc_11", "subjectId": "science", "groupName": "Phân tích số liệu", "name": "Biểu đồ Venn", "description": "Bài toán tập hợp con, phần bù, giao và hợp; giải bài toán số người tham gia nhiều hoạt động.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_12", "subjectId": "science", "groupName": "Phân tích số liệu", "name": "Histogram", "description": "Biểu đồ tần số phân phối theo khoảng, phát hiện độ lệch chuẩn, phân phối chuẩn và ngoại lai.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_13", "subjectId": "science", "groupName": "Phân tích số liệu", "name": "Biểu đồ tần suất tích lũy", "description": "Đường cong tích lũy phân vị, xác định bách phân vị và khoảng tứ phân vị.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_14", "subjectId": "science", "groupName": "Phân tích số liệu", "name": "So sánh và suy luận dữ liệu", "description": "Đánh giá nhận định đúng/sai dựa trên các bảng biểu kết hợp, phát hiện tương quan giả.", "masteryLevel": 3, "status": "in_progress", "priority": "high"},

        # C. Suy luận khoa học
        {"id": "top_sc_15", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Vật lý", "description": "Cơ học, nhiệt học, điện từ học, quang học, dao động và sóng, vật lý hạt nhân ứng dụng.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_16", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Hóa học", "description": "Cấu tạo chất, phản ứng hóa học, hóa học hữu cơ/vô cơ, dung dịch, hóa học môi trường.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_17", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Sinh học", "description": "Di truyền học, sinh học tế bào, cơ thể sinh vật, sinh thái học và tiến hóa.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_18", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Lịch sử", "description": "Lịch sử Việt Nam hiện đại, lịch sử thế giới cận hiện đại, nguyên nhân - hệ quả sự kiện.", "masteryLevel": 3, "status": "in_progress", "priority": "low"},
        {"id": "top_sc_19", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Địa lý", "description": "Địa lý tự nhiên, địa lý kinh tế xã hội Việt Nam, khí hậu, tài nguyên, dân số.", "masteryLevel": 3, "status": "in_progress", "priority": "low"},
        {"id": "top_sc_20", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Giáo dục kinh tế và pháp luật", "description": "Kiến thức kinh tế vi mô/vĩ mô cơ bản, thị trường, lạm phát, quyền và nghĩa vụ pháp luật.", "masteryLevel": 3, "status": "in_progress", "priority": "low"},
        {"id": "top_sc_21", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Công nghệ và các tình huống liên ngành", "description": "Ứng dụng khoa học kỹ thuật số, công nghệ sinh học, nông nghiệp công nghệ cao, AI.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_22", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Đọc hiểu dữ liệu thí nghiệm", "description": "Đọc báo cáo khoa học, giả thuyết nghiên cứu, nhóm chứng và nhóm thực nghiệm, biến số phụ thuộc/độc lập.", "masteryLevel": 2, "status": "needs_review", "priority": "high"},
        {"id": "top_sc_23", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Giải thích hiện tượng", "description": "Vận dụng kiến thức khoa học tự nhiên giải thích các hiện tượng đời sống và sản xuất.", "masteryLevel": 3, "status": "in_progress", "priority": "medium"},
        {"id": "top_sc_24", "subjectId": "science", "groupName": "Suy luận khoa học", "name": "Dự đoán kết quả từ dữ kiện", "description": "Ngoại suy dữ liệu, dự báo xu thế diễn biến của hệ thống sinh thái, vật lý hoặc hóa học.", "masteryLevel": 3, "status": "in_progress", "priority": "high"}
    ]

print(f"Total default topics prepared: {len(get_topics_data())}")
