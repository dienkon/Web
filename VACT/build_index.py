# -*- coding: utf-8 -*-
"""
Main Builder Script: Generates index.html for V-ACT Study Tracker
"""

import os
import json
from generate_topics import get_topics_data
from app_css import CSS_CONTENT
from app_js import JS_CONTENT

def build_index_html():
    topics = get_topics_data()
    topics_json = json.dumps(topics, ensure_ascii=False)

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>V-ACT Study Tracker — Quản Lý & Phân Tích Ôn Thi ĐGNL ĐHQG-HCM</title>
  <meta name="description" content="Ứng dụng cá nhân theo dõi quá trình ôn thi Đánh giá năng lực Đại học Quốc gia TP.HCM (V-ACT) với bảng điều khiển trực quan, sổ tay lỗi sai và chấm điểm theo chuẩn 1.200.">
  <style>
{CSS_CONTENT}
  </style>
</head>
<body>
  <!-- Toast Notification Container -->
  <div id="toast-container"></div>

  <!-- Mobile Sidebar Backdrop -->
  <div id="sidebar-backdrop" class="sidebar-backdrop"></div>

  <div id="app-container">
    <!-- SIDEBAR -->
    <aside id="sidebar">
      <div class="sidebar-header">
        <a href="#" class="brand-badge" onclick="UI.navigate('overview'); return false;">
          <div class="brand-icon">V</div>
          <div class="brand-name">
            <span>V-ACT Tracker</span>
            <span class="brand-sub">ĐGNL ĐHQG-HCM</span>
          </div>
        </a>
      </div>

      <nav class="sidebar-nav">
        <a class="nav-link active" data-view="overview">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          <span>Tổng quan</span>
        </a>

        <a class="nav-link" data-view="topics">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>Chuyên đề ôn tập</span>
          <span class="nav-badge" id="nav-topics-count">96</span>
        </a>

        <a class="nav-link" data-view="exams">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>Thi thử V-ACT</span>
        </a>

        <a class="nav-link" data-view="notes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Sổ tay ghi chú</span>
        </a>

        <a class="nav-link" data-view="analytics">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span>Phân tích tiến bộ</span>
        </a>

        <a class="nav-link" data-view="settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Sao lưu & Cài đặt</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="target-mini-card">
          <div class="target-mini-header">
            <span>Mục tiêu điểm</span>
            <span id="sb-target-val">950</span>
          </div>
          <div class="target-mini-score">
            <span id="sb-latest-val">--</span>
            <span>/ 1.200</span>
          </div>
          <div class="progress-track">
            <div id="sb-target-progress" class="progress-fill" style="width: 0%;"></div>
          </div>
        </div>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main id="main-content">
      <!-- HEADER -->
      <header id="top-header">
        <div class="header-left">
          <button id="btn-mobile-menu" class="btn-mobile-menu" aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="page-title-box">
            <h1 id="page-title">Tổng quan học tập</h1>
            <p id="page-desc">Bảng theo dõi tiến độ và hiệu suất ôn thi V-ACT</p>
          </div>
        </div>

        <div class="header-right">
          <!-- Auto-save status indicator -->
          <div id="save-status-indicator" class="save-status-pill" title="Trạng thái lưu trữ dữ liệu tự động trên trình duyệt">
            <span class="save-status-dot"></span>
            <span class="save-text">Đã lưu</span>
          </div>

          <!-- Quick Add Button with Dropdown -->
          <div class="quick-add-container">
            <button id="btn-quick-add" class="btn btn-primary" style="border-radius: 999px; padding: 7px 16px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Thêm nhanh</span>
            </button>
            <div id="quick-add-menu" class="dropdown-menu">
              <button class="dropdown-item" onclick="UI.openExamForm();">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Tạo thi thử V-ACT</span>
              </button>
              <button class="dropdown-item" onclick="UI.openNewTopicForm();">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span>Thêm chuyên đề mới</span>
              </button>
              <button class="dropdown-item" onclick="UI.openNoteForm();">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>Thêm ghi chú / Lỗi sai</span>
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" onclick="UI.navigate('topics');">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                <span>Ghi nhận luyện chuyên đề</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <div class="content-body">

        <!-- ==========================================
             VIEW 1: OVERVIEW DASHBOARD
             ========================================== -->
        <section id="view-overview" class="view-section">
          <!-- Smart Insight Banner -->
          <div id="overview-insight-banner" class="insight-banner" style="display:none;"></div>

          <!-- KPI Grid -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Điểm gần nhất</div>
              <div id="kpi-latest-score" class="kpi-value">--</div>
              <div class="kpi-sub">Thang điểm 1.200 V-ACT</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Điểm cao nhất</div>
              <div id="kpi-high-score" class="kpi-value">--</div>
              <div class="kpi-sub">Kỷ lục các đợt thi đủ điểm</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Số đề đã làm</div>
              <div id="kpi-total-exams" class="kpi-value">0</div>
              <div class="kpi-sub">Tổng số đợt thi thử</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Độ chính xác TB</div>
              <div id="kpi-avg-acc" class="kpi-value">--</div>
              <div class="kpi-sub">Tỷ lệ trả lời đúng</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Nắm vững</div>
              <div id="kpi-mastered-topics" class="kpi-value">--</div>
              <div class="kpi-sub">Chuyên đề đã hoàn thành</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Lỗi cần ôn</div>
              <div id="kpi-unresolved-errors" class="kpi-value" style="color:var(--danger)">0</div>
              <div class="kpi-sub">Lỗi sai chưa khắc phục</div>
            </div>
          </div>

          <!-- Charts Grid -->
          <div class="charts-grid">
            <!-- Chart 1: Score Progress Line Chart -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                    Tiến độ điểm thi thử V-ACT
                  </h3>
                  <div class="card-subtitle">Điểm tổng theo thang 1.200 qua các lần thi hoàn chỉnh</div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-sm btn-outline chart-filter-btn" data-days="7">7 ngày</button>
                  <button class="btn btn-sm btn-outline chart-filter-btn" data-days="30">30 ngày</button>
                  <button class="btn btn-sm btn-outline chart-filter-btn" data-days="90">90 ngày</button>
                  <button class="btn btn-sm btn-outline chart-filter-btn btn-primary" data-days="all">Tất cả</button>
                </div>
              </div>
              <div id="chart-score-trend-container" class="chart-container"></div>
            </div>

            <!-- Chart 2: 4 Subjects Performance Chart -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V9"/><path d="M15 17v-4"/></svg>
                    Hiệu suất 4 phần thi
                  </h3>
                  <div class="card-subtitle">So sánh tiến bộ từng môn</div>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; gap:6px;">
                  <span class="badge sub-tag-tv" style="cursor:pointer;" onclick="UI.toggleChartSubject('vietnamese')">TV</span>
                  <span class="badge sub-tag-en" style="cursor:pointer;" onclick="UI.toggleChartSubject('english')">TA</span>
                  <span class="badge sub-tag-ma" style="cursor:pointer;" onclick="UI.toggleChartSubject('math')">Toán</span>
                  <span class="badge sub-tag-sc" style="cursor:pointer;" onclick="UI.toggleChartSubject('science')">TDKH</span>
                </div>
                <select class="form-control" style="width:auto; padding:4px 8px; font-size:12px;" onchange="UI.chartSubjectMetric = this.value; UI.renderSubjectPerformanceChart();">
                  <option value="score">Điểm V-ACT (/300)</option>
                  <option value="correct">Số câu đúng (/30)</option>
                  <option value="rate">Tỷ lệ đúng (%)</option>
                </select>
              </div>
              <div id="chart-subjects-container" class="chart-container"></div>
            </div>
          </div>

          <!-- Bottom Grid: Attention & Due Reviews -->
          <div class="dashboard-bottom-grid">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Chuyên đề cần chú ý (nhiều lỗi sai)
                </h3>
                <button class="btn btn-sm btn-outline" onclick="UI.navigate('topics')">Xem tất cả</button>
              </div>
              <div id="overview-attention-list"></div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                  Việc cần ôn hôm nay
                </h3>
                <button class="btn btn-sm btn-outline" onclick="UI.navigate('notes')">Xem sổ tay</button>
              </div>
              <div id="overview-due-list"></div>
            </div>
          </div>
        </section>

        <!-- ==========================================
             VIEW 2: CHUYÊN ĐỀ ÔN TẬP (TOPICS)
             ========================================== -->
        <section id="view-topics" class="view-section" style="display:none;">
          <!-- 4 Subject Tabs -->
          <div class="tab-list">
            <button class="tab-btn topic-sub-tab active" data-sub="vietnamese" onclick="UI.activeTopicSubject='vietnamese'; UI.activeTopicGroup='all'; UI.renderTopics();">
              <span>Tiếng Việt (30 câu)</span>
            </button>
            <button class="tab-btn topic-sub-tab" data-sub="english" onclick="UI.activeTopicSubject='english'; UI.activeTopicGroup='all'; UI.renderTopics();">
              <span>Tiếng Anh (30 câu)</span>
            </button>
            <button class="tab-btn topic-sub-tab" data-sub="math" onclick="UI.activeTopicSubject='math'; UI.activeTopicGroup='all'; UI.renderTopics();">
              <span>Toán học (30 câu)</span>
            </button>
            <button class="tab-btn topic-sub-tab" data-sub="science" onclick="UI.activeTopicSubject='science'; UI.activeTopicGroup='all'; UI.renderTopics();">
              <span>Tư duy khoa học (30 câu)</span>
            </button>
          </div>

          <!-- Subject Stats Banner -->
          <div id="topics-subject-stats" class="subject-stats-banner"></div>

          <!-- Filter & Search Bar -->
          <div class="filter-bar">
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input id="topic-search-input" type="text" class="form-control" placeholder="Tìm kiếm chuyên đề...">
            </div>

            <select id="topic-filter-group" class="form-control" style="width: 220px;">
              <option value="all">Tất cả nhóm</option>
            </select>

            <select id="topic-filter-status" class="form-control" style="width: 170px;">
              <option value="all">Tất cả trạng thái</option>
              <option value="not_started">Chưa học</option>
              <option value="in_progress">Đang học</option>
              <option value="needs_review">Cần ôn lại</option>
              <option value="mastered">Đã nắm vững</option>
            </select>

            <button class="btn btn-primary" onclick="UI.openNewTopicForm()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Thêm chuyên đề</span>
            </button>
          </div>

          <!-- Topics List / Accordions -->
          <div id="topics-list-container"></div>
        </section>

        <!-- ==========================================
             VIEW 3: THI THỬ V-ACT (EXAMS)
             ========================================== -->
        <section id="view-exams" class="view-section" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <div>
              <h2 style="font-size:18px; font-weight:700; color:var(--text-main);">Lịch sử các đợt thi thử V-ACT</h2>
              <p style="font-size:12.5px; color:var(--text-muted);">Quản lý, phân tích điểm 4 phần thi và thống kê chi tiết từng câu làm sai.</p>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-outline" onclick="StorageService.exportCSV(UI.state, 'exams')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Xuất CSV
              </button>
              <button class="btn btn-primary" onclick="UI.openExamForm()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                + Thêm đợt thi thử
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Đợt thi & Nguồn</th>
                  <th>Ngày thi</th>
                  <th>Số câu đúng</th>
                  <th>Tổng điểm</th>
                  <th>Điểm 4 môn (TV - TA - Toán - TDKH)</th>
                  <th>Lỗi sai</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody id="exams-table-body"></tbody>
            </table>
          </div>
        </section>

        <!-- ==========================================
             VIEW 4: SỔ TAY GHI CHÚ (NOTEBOOK)
             ========================================== -->
        <section id="view-notes" class="view-section" style="display:none;">
          <div class="filter-bar">
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input id="note-search-input" type="text" class="form-control" placeholder="Tìm kiếm ghi chú, công thức, lỗi sai...">
            </div>

            <select id="note-filter-subject" class="form-control" style="width: 170px;">
              <option value="all">Tất cả môn</option>
              <option value="vietnamese">Tiếng Việt</option>
              <option value="english">Tiếng Anh</option>
              <option value="math">Toán học</option>
              <option value="science">Tư duy khoa học</option>
            </select>

            <select id="note-filter-type" class="form-control" style="width: 170px;">
              <option value="all">Tất cả loại</option>
              <option value="wrong_question">Lỗi sai (Error)</option>
              <option value="key_knowledge">Kiến thức quan trọng</option>
              <option value="formula">Công thức</option>
              <option value="shortcut">Mẹo giải nhanh</option>
              <option value="hard_question">Câu hỏi khó</option>
            </select>

            <select id="note-filter-status" class="form-control" style="width: 170px;">
              <option value="all">Tất cả trạng thái</option>
              <option value="not_reviewed">Chưa ôn</option>
              <option value="reviewing">Đang ôn</option>
              <option value="understood">Đã hiểu</option>
              <option value="resolved">Đã khắc phục</option>
            </select>

            <button class="btn btn-primary" onclick="UI.openNoteForm()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Tạo ghi chú
            </button>
          </div>

          <div class="notebook-layout">
            <!-- Sidebar filter / counts -->
            <div class="card notebook-sidebar">
              <h4 style="font-size:13.5px; font-weight:700; margin-bottom:12px; color:var(--text-main);">Bộ lọc nhanh</h4>
              <div style="display:flex; flex-direction:column; gap:6px; font-size:13px;">
                <button class="btn btn-sm btn-outline" style="justify-content:space-between;" onclick="document.getElementById('note-filter-type').value='wrong_question'; UI.noteTypeFilter='wrong_question'; UI.renderNotes();">
                  <span>❌ Lỗi sai chưa giải quyết</span>
                  <span class="badge badge-red" id="note-sb-unresolved-count">0</span>
                </button>
                <button class="btn btn-sm btn-outline" style="justify-content:space-between;" onclick="document.getElementById('note-filter-type').value='formula'; UI.noteTypeFilter='formula'; UI.renderNotes();">
                  <span>📐 Sổ tay công thức</span>
                </button>
                <button class="btn btn-sm btn-outline" style="justify-content:space-between;" onclick="document.getElementById('note-filter-type').value='shortcut'; UI.noteTypeFilter='shortcut'; UI.renderNotes();">
                  <span>⚡ Mẹo giải nhanh</span>
                </button>
                <button class="btn btn-sm btn-outline" style="justify-content:space-between;" onclick="document.getElementById('note-filter-type').value='all'; document.getElementById('note-filter-status').value='all'; UI.noteTypeFilter='all'; UI.noteStatusFilter='all'; UI.renderNotes();">
                  <span>Tất cả ghi chú</span>
                </button>
              </div>
            </div>

            <!-- Notes List Column -->
            <div id="notes-list-container" style="max-height: calc(100vh - 220px); overflow-y: auto;"></div>

            <!-- Note Detail / Editor Pane -->
            <div id="note-detail-pane" class="note-detail-pane"></div>
          </div>
        </section>

        <!-- ==========================================
             VIEW 5: PHÂN TÍCH TIẾN BỘ (ANALYTICS)
             ========================================== -->
        <section id="view-analytics" class="view-section" style="display:none;">
          <!-- 1. Exam Comparison Tool -->
          <div class="comparison-box">
            <div class="card-header">
              <div>
                <h3 class="card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/></svg>
                  So sánh trực tiếp 2 đợt thi thử
                </h3>
                <div class="card-subtitle">Đối chiếu tổng điểm và từng môn để nhận diện tiến bộ</div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
              <div class="form-group">
                <label class="form-label">Đợt thi A (Gốc):</label>
                <select id="comp-exam-a" class="form-control" onchange="UI.updateExamComparison()"></select>
              </div>
              <div class="form-group">
                <label class="form-label">Đợt thi B (Mới hơn):</label>
                <select id="comp-exam-b" class="form-control" onchange="UI.updateExamComparison()"></select>
              </div>
            </div>

            <div id="exam-comparison-result"></div>
          </div>

          <!-- 2. Subject Summaries -->
          <h3 style="font-size:16px; font-weight:700; margin:24px 0 12px; color:var(--text-main);">Tổng kết năng lực theo 4 môn thi</h3>
          <div id="analytics-subject-summaries" style="margin-bottom:24px;"></div>

          <!-- 3. Topic Performance Matrix -->
          <div class="card" style="margin-bottom:24px;">
            <div class="card-header">
              <div>
                <h3 class="card-title">Ma trận hiệu suất chuyên đề</h3>
                <div class="card-subtitle">Thống kê số lần luyện, số câu đúng và tổng lỗi sai đã ghi nhận</div>
              </div>
              <button class="btn btn-sm btn-outline" onclick="StorageService.exportCSV(UI.state, 'topics')">Xuất CSV chuyên đề</button>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Chuyên đề</th>
                    <th>Môn</th>
                    <th>Luyện tập</th>
                    <th>Tỷ lệ đúng</th>
                    <th>Số lỗi sai</th>
                    <th>Thành thạo</th>
                    <th>Lần ôn cuối</th>
                  </tr>
                </thead>
                <tbody id="analytics-topic-matrix-body"></tbody>
              </table>
            </div>
          </div>

          <!-- 4. Activity Log Timeline -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                Nhật ký hoạt động & tiến bộ học tập
              </h3>
              <button class="btn btn-sm btn-outline" onclick="window.print()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                In báo cáo (PDF)
              </button>
            </div>
            <div id="analytics-activity-timeline" class="timeline"></div>
          </div>
        </section>

        <!-- ==========================================
             VIEW 6: SAO LƯU & CÀI ĐẶT (SETTINGS)
             ========================================== -->
        <section id="view-settings" class="view-section" style="display:none;">
          <div style="max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">

            <!-- Settings Card -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Cài đặt mục tiêu ôn thi</h3>
              </div>
              <div class="form-group">
                <label class="form-label">
                  <span>Mục tiêu điểm V-ACT tổng:</span>
                  <span class="hint">Thang điểm 1.200</span>
                </label>
                <div style="display:flex; gap:10px;">
                  <input id="setting-target-score" type="number" min="0" max="1200" class="form-control" style="width:200px;" value="950">
                  <button class="btn btn-primary" onclick="UI.saveSettings()">Lưu mục tiêu</button>
                </div>
              </div>
            </div>

            <!-- Backup & Export -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Sao lưu & Xuất dữ liệu</h3>
              </div>
              <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
                Toàn bộ dữ liệu của bạn được lưu an toàn trên trình duyệt hiện tại. Hãy thường xuyên tải file JSON sao lưu về máy tính để bảo đảm không bị mất dữ liệu khi xóa cache hoặc đổi thiết bị.
              </p>

              <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
                <button class="btn btn-primary" onclick="StorageService.exportJSON(UI.state)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Tải file sao lưu (JSON)
                </button>

                <label class="btn btn-secondary" style="margin-bottom:0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Khôi phục từ file JSON</span>
                  <input type="file" accept=".json" style="display:none;" onchange="UI.handleImportFileSelect(event)">
                </label>
              </div>

              <div style="border-top:1px solid var(--border); padding-top:16px;">
                <h4 style="font-size:13.5px; font-weight:600; margin-bottom:10px;">Xuất báo cáo định dạng CSV (Excel):</h4>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  <button class="btn btn-sm btn-outline" onclick="StorageService.exportCSV(UI.state, 'exams')">Lịch sử thi thử</button>
                  <button class="btn btn-sm btn-outline" onclick="StorageService.exportCSV(UI.state, 'practice')">Kết quả luyện tập</button>
                  <button class="btn btn-sm btn-outline" onclick="StorageService.exportCSV(UI.state, 'notes')">Sổ tay ghi chú & lỗi</button>
                  <button class="btn btn-sm btn-outline" onclick="StorageService.exportCSV(UI.state, 'topics')">Thống kê chuyên đề</button>
                </div>
              </div>
            </div>

            <!-- Storage Info -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Thông tin bộ nhớ cục bộ</h3>
              </div>
              <div style="font-size:13.5px;">
                <p>Dung lượng dữ liệu đang sử dụng: <strong id="setting-storage-size">--</strong></p>
                <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                  Ứng dụng hoạt động 100% offline, không gửi bất kỳ thông tin nào lên máy chủ bên ngoài.
                </p>
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="card" style="border-color:#FCA5A5; background:#FFF5F5;">
              <div class="card-header">
                <h3 class="card-title" style="color:var(--danger)">Vùng nguy hiểm</h3>
              </div>
              <p style="font-size:13px; color:#7F1D1D; margin-bottom:14px;">
                Xóa toàn bộ các đợt thi thử, ghi chú, lịch sử luyện tập và đưa chuyên đề về mặc định ban đầu.
              </p>
              <button class="btn btn-danger" onclick="UI.showModal('modal-danger-reset')">
                Xóa toàn bộ dữ liệu ứng dụng
              </button>
            </div>

          </div>
        </section>

      </div>
    </main>
  </div>

  <!-- =========================================================================
       MODALS
       ========================================================================= -->

  <!-- MODAL: EXAM FORM (Mode A: Quick & Mode B: 120-Questions Grid) -->
  <div id="modal-exam-form" class="modal-backdrop">
    <div class="modal-dialog modal-xl">
      <div class="modal-header">
        <h3 id="modal-exam-form-title" class="modal-title">Thêm đợt thi thử mới</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-exam-form')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="exam-form-id">

        <!-- Basic Exam Info -->
        <div class="form-row" style="margin-bottom:16px;">
          <div class="form-group" style="flex:2;">
            <label class="form-label">Tên đợt thi thử:<span class="req">*</span></label>
            <input id="exam-form-name" type="text" class="form-control" placeholder="Ví dụ: Thi thử V-ACT Đợt 1 2026, Đề minh họa ĐHQG...">
          </div>
          <div class="form-group">
            <label class="form-label">Ngày làm đề:<span class="req">*</span></label>
            <input id="exam-form-date" type="date" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">Thời gian làm (phút):</label>
            <input id="exam-form-duration" type="number" class="form-control" value="150" min="1" max="300">
          </div>
        </div>

        <div class="form-row" style="margin-bottom:20px;">
          <div class="form-group">
            <label class="form-label">Nguồn đề / Tài liệu:</label>
            <input id="exam-form-source" type="text" class="form-control" placeholder="Ví dụ: ĐHQG-HCM, Sách luyện thi, Trung tâm...">
          </div>
          <div class="form-group">
            <label class="form-label">Ghi chú chung:</label>
            <input id="exam-form-notes" type="text" class="form-control" placeholder="Tâm lý làm bài, phòng thi, điều kiện làm...">
          </div>
        </div>

        <!-- Mode Selector Switch -->
        <div class="exam-mode-switch">
          <button type="button" class="exam-mode-btn active" data-mode="quick" onclick="UI.setExamFormMode('quick')">
            Chế độ A: Nhập nhanh theo 4 môn
          </button>
          <button type="button" class="exam-mode-btn" data-mode="detailed" onclick="UI.setExamFormMode('detailed')">
            Chế độ B: Chấm chi tiết 120 câu hỏi
          </button>
        </div>

        <!-- Mode A Pane: Quick Score Table -->
        <div id="exam-mode-quick-pane">
          <table class="quick-exam-table">
            <thead>
              <tr>
                <th>Thành phần môn</th>
                <th style="width:140px;">Số câu đúng (/30)</th>
                <th>Số câu sai</th>
                <th>Tỷ lệ đúng</th>
                <th style="width:160px;">Điểm V-ACT (/300)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Tiếng Việt</strong> (Câu 1–30)</td>
                <td><input id="exam-quick-vietnamese-correct" type="number" class="form-control" min="0" max="30" placeholder="0–30"></td>
                <td id="exam-quick-vietnamese-wrong">--</td>
                <td id="exam-quick-vietnamese-acc">--</td>
                <td><input id="exam-quick-vietnamese-score" type="number" class="form-control" min="0" max="300" placeholder="0–300"></td>
              </tr>
              <tr>
                <td><strong>Tiếng Anh</strong> (Câu 31–60)</td>
                <td><input id="exam-quick-english-correct" type="number" class="form-control" min="0" max="30" placeholder="0–30"></td>
                <td id="exam-quick-english-wrong">--</td>
                <td id="exam-quick-english-acc">--</td>
                <td><input id="exam-quick-english-score" type="number" class="form-control" min="0" max="300" placeholder="0–300"></td>
              </tr>
              <tr>
                <td><strong>Toán học</strong> (Câu 61–90)</td>
                <td><input id="exam-quick-math-correct" type="number" class="form-control" min="0" max="30" placeholder="0–30"></td>
                <td id="exam-quick-math-wrong">--</td>
                <td id="exam-quick-math-acc">--</td>
                <td><input id="exam-quick-math-score" type="number" class="form-control" min="0" max="300" placeholder="0–300"></td>
              </tr>
              <tr>
                <td>
                  <strong>Tư duy khoa học</strong> (Câu 91–120)
                  <div style="font-size:11px; color:var(--text-muted);">Logic (12c) + Suy luận KH (18c)</div>
                </td>
                <td><input id="exam-quick-science-correct" type="number" class="form-control" min="0" max="30" placeholder="0–30"></td>
                <td id="exam-quick-science-wrong">--</td>
                <td id="exam-quick-science-acc">--</td>
                <td><input id="exam-quick-science-score" type="number" class="form-control" min="0" max="300" placeholder="0–300"></td>
              </tr>
              <tr class="total-row">
                <td>TỔNG KẾT BÀI THI</td>
                <td id="exam-quick-total-correct">0/120</td>
                <td>--</td>
                <td id="exam-quick-total-acc">0%</td>
                <td id="exam-quick-total-score">0/1.200</td>
              </tr>
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; align-items:center; background:#FAFBFD; padding:12px 16px; border-radius:8px; border:1px solid var(--border);">
            <span style="font-size:13px; color:var(--text-muted);">So với mục tiêu điểm:</span>
            <span id="exam-quick-delta-target" class="delta-pill">--</span>
          </div>
        </div>

        <!-- Mode B Pane: Detailed 120 Questions Grid -->
        <div id="exam-mode-grid-pane" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div style="font-size:12.5px; color:var(--text-muted);">
              Click vào câu để chuyển đổi trạng thái: <strong>Đúng (Xanh)</strong> → <strong>Sai (Đỏ)</strong> → <strong>Bỏ trống (Xám)</strong> → <strong>Chưa chấm</strong>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn-sm btn-outline" onclick="UI.setAllQuestionsCorrect()">Đánh dấu tất cả đúng</button>
              <button type="button" class="btn btn-sm btn-outline" onclick="UI.resetAllQuestions()">Đặt lại trạng thái</button>
            </div>
          </div>

          <!-- Wrong Question Drawer / Editor Card -->
          <div id="wrong-q-drawer-panel" class="wrong-q-panel" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <strong id="wrong-q-drawer-title" style="color:var(--danger); font-size:13.5px;">Ghi nhận lỗi sai câu hỏi</strong>
              <button type="button" class="modal-close" onclick="document.getElementById('wrong-q-drawer-panel').style.display='none'">✕</button>
            </div>
            <div class="form-row" style="margin-bottom:10px;">
              <div class="form-group" style="flex:2;">
                <label class="form-label">Chuyên đề liên quan:</label>
                <select id="wrong-q-topic-select" class="form-control"></select>
              </div>
              <div class="form-group">
                <label class="form-label">Nguyên nhân sai:</label>
                <select id="wrong-q-reason-select" class="form-control">
                  <option value="Nhầm công thức">Nhầm công thức</option>
                  <option value="Đọc sót đề / Bẫy câu chữ">Đọc sót đề / Bẫy câu chữ</option>
                  <option value="Hổng kiến thức">Hổng kiến thức</option>
                  <option value="Tính toán ẩu">Tính toán ẩu</option>
                  <option value="Thiếu thời gian">Thiếu thời gian</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Ghi chú nhanh câu sai:</label>
              <input id="wrong-q-note-input" type="text" class="form-control" placeholder="Ví dụ: Cần phân biệt biến cố độc lập và xung khắc...">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="font-size:12.5px; display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input id="wrong-q-review-check" type="checkbox"> Đánh dấu cần ôn lại
              </label>
              <div style="display:flex; gap:8px;">
                <button type="button" class="btn btn-sm btn-outline" onclick="UI.createNoteFromWrongQuestionDrawer()">📝 Tạo ghi chú trong Sổ tay</button>
                <button type="button" class="btn btn-sm btn-primary" onclick="UI.saveWrongQuestionDrawer()">Lưu lỗi câu này</button>
              </div>
            </div>
          </div>

          <!-- 120 Grid Container -->
          <div id="exam-grid-container" style="max-height:480px; overflow-y:auto; padding-right:6px;"></div>
        </div>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="UI.closeModal('modal-exam-form')">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" onclick="UI.saveExamForm()">Lưu đợt thi</button>
      </div>
    </div>
  </div>

  <!-- MODAL: EXAM DETAIL -->
  <div id="modal-exam-detail" class="modal-backdrop">
    <div class="modal-dialog modal-lg">
      <div class="modal-header">
        <h3 id="modal-exam-detail-title" class="modal-title">Chi tiết đợt thi thử</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-exam-detail')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div id="modal-exam-detail-body" class="modal-body"></div>
    </div>
  </div>

  <!-- MODAL: TOPIC DETAIL -->
  <div id="modal-topic-detail" class="modal-backdrop">
    <div class="modal-dialog modal-lg">
      <div class="modal-header">
        <h3 id="modal-topic-detail-title" class="modal-title">Chi tiết chuyên đề</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-topic-detail')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div id="modal-topic-detail-body" class="modal-body"></div>
    </div>
  </div>

  <!-- MODAL: TOPIC FORM (Create / Edit) -->
  <div id="modal-topic-form" class="modal-backdrop">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 id="modal-topic-form-title" class="modal-title">Thêm chuyên đề mới</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-topic-form')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="topic-form-id">
        <div class="form-group">
          <label class="form-label">Môn học:<span class="req">*</span></label>
          <select id="topic-form-sub" class="form-control">
            <option value="vietnamese">Tiếng Việt</option>
            <option value="english">Tiếng Anh</option>
            <option value="math">Toán học</option>
            <option value="science">Tư duy khoa học</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nhóm chuyên đề:<span class="req">*</span></label>
          <input id="topic-form-group" type="text" class="form-control" placeholder="Ví dụ: Đại số, Giải tích, Đọc hiểu, Grammar...">
        </div>
        <div class="form-group">
          <label class="form-label">Tên chuyên đề:<span class="req">*</span></label>
          <input id="topic-form-name" type="text" class="form-control" placeholder="Ví dụ: Xác suất cổ điển, Mệnh đề logic...">
        </div>
        <div class="form-group">
          <label class="form-label">Mô tả tóm tắt nội dung ôn:</label>
          <textarea id="topic-form-desc" class="form-control" placeholder="Các dạng bài tập, công thức hay gặp trong đề thi..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Mức độ ưu tiên:</label>
            <select id="topic-form-priority" class="form-control">
              <option value="low">Thấp</option>
              <option value="medium" selected>Trung bình</option>
              <option value="high">Cao (Cần ôn gấp)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Trạng thái:</label>
            <select id="topic-form-status" class="form-control">
              <option value="not_started">Chưa học</option>
              <option value="in_progress">Đang học</option>
              <option value="needs_review">Cần ôn lại</option>
              <option value="mastered">Đã nắm vững</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="UI.closeModal('modal-topic-form')">Hủy</button>
        <button class="btn btn-primary" onclick="UI.saveTopicForm()">Lưu chuyên đề</button>
      </div>
    </div>
  </div>

  <!-- MODAL: NOTE FORM (Create / Edit) -->
  <div id="modal-note-form" class="modal-backdrop">
    <div class="modal-dialog modal-lg">
      <div class="modal-header">
        <h3 id="modal-note-form-title" class="modal-title">Tạo ghi chú mới</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-note-form')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="note-form-id">
        <input type="hidden" id="note-form-exam-id">
        <input type="hidden" id="note-form-qnum">
        <div class="form-group">
          <label class="form-label">Tiêu đề ghi chú:<span class="req">*</span></label>
          <input id="note-form-title" type="text" class="form-control" placeholder="Ví dụ: Công thức tính xác suất có điều kiện, Cách tránh bẫy câu 45...">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Môn học:<span class="req">*</span></label>
            <select id="note-form-sub" class="form-control">
              <option value="vietnamese">Tiếng Việt</option>
              <option value="english">Tiếng Anh</option>
              <option value="math">Toán học</option>
              <option value="science">Tư duy khoa học</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Chuyên đề liên kết:</label>
            <select id="note-form-topic" class="form-control"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Loại ghi chú:</label>
            <select id="note-form-type" class="form-control">
              <option value="key_knowledge">💡 Kiến thức quan trọng</option>
              <option value="formula">📐 Công thức toán / lý</option>
              <option value="shortcut">⚡ Mẹo giải nhanh</option>
              <option value="wrong_question">❌ Rút kinh nghiệm câu sai</option>
              <option value="hard_question">🎯 Phân tích câu hỏi khó</option>
              <option value="review_needed">🔄 Kiến thức cần ôn lại</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Nội dung ghi chú (Hỗ trợ Markdown cơ bản):</label>
          <textarea id="note-form-content" class="form-control" style="min-height:110px;" placeholder="Ghi chép công thức, đề bài, cách giải, lưu ý..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Lời giải chuẩn / Kiến thức chuẩn:</label>
          <textarea id="note-form-solution" class="form-control" style="min-height:70px;" placeholder="Cách làm đúng hoặc công thức chuẩn để ôn lại..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nguyên nhân sai (nếu là câu sai):</label>
            <input id="note-form-rootcause" type="text" class="form-control" placeholder="Ví dụ: Nhầm điều kiện, tính toán vội...">
          </div>
          <div class="form-group">
            <label class="form-label">Phương pháp tránh lặp lại lỗi:</label>
            <input id="note-form-prevention" type="text" class="form-control" placeholder="Ví dụ: Đọc kỹ chữ 'không đúng', vẽ bảng chân trị...">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Thẻ tags (cách nhau bằng dấu phẩy):</label>
            <input id="note-form-tags" type="text" class="form-control" placeholder="xác suất, bẫy đề, công thức">
          </div>
          <div class="form-group">
            <label class="form-label">Độ ưu tiên:</label>
            <select id="note-form-priority" class="form-control">
              <option value="low">Thấp</option>
              <option value="medium" selected>Trung bình</option>
              <option value="high">Cao (Cần ôn gấp)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Trạng thái ôn tập:</label>
            <select id="note-form-status" class="form-control">
              <option value="not_reviewed">Chưa ôn</option>
              <option value="reviewing">Đang ôn</option>
              <option value="understood">Đã hiểu</option>
              <option value="resolved">Đã khắc phục hoàn toàn</option>
            </select>
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="UI.closeModal('modal-note-form')">Hủy</button>
        <button class="btn btn-primary" onclick="UI.saveNoteForm()">Lưu ghi chú</button>
      </div>
    </div>
  </div>

  <!-- MODAL: PRACTICE SESSION FORM -->
  <div id="modal-practice-form" class="modal-backdrop">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">Ghi nhận buổi luyện chuyên đề</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-practice-form')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="practice-form-topic-id">
        <input type="hidden" id="practice-form-sub-id">

        <div class="form-group">
          <label class="form-label">Chuyên đề ôn luyện:</label>
          <input id="practice-form-topic-name" type="text" class="form-control" disabled>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tổng số câu đã làm:<span class="req">*</span></label>
            <input id="practice-form-total" type="number" class="form-control" value="40" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Số câu làm đúng:<span class="req">*</span></label>
            <input id="practice-form-correct" type="number" class="form-control" value="32" min="0">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Ngày luyện:</label>
            <input id="practice-form-date" type="date" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">Thời gian làm (phút):</label>
            <input id="practice-form-duration" type="number" class="form-control" value="45" min="1">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Nguồn tài liệu / Đề bài:</label>
          <input id="practice-form-source" type="text" class="form-control" placeholder="Ví dụ: Chuyên đề 200 câu của thầy cô, Đề luyện thêm...">
        </div>

        <div class="form-group">
          <label class="form-label">Ghi chú buổi luyện:</label>
          <input id="practice-form-notes" type="text" class="form-control" placeholder="Cảm nhận mức độ khó, dạng bài hay bị sai...">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="UI.closeModal('modal-practice-form')">Hủy</button>
        <button class="btn btn-primary" onclick="UI.savePracticeForm()">Lưu buổi luyện tập</button>
      </div>
    </div>
  </div>

  <!-- MODAL: IMPORT JSON PREVIEW -->
  <div id="modal-import-preview" class="modal-backdrop">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">Khôi phục dữ liệu từ file sao lưu</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-import-preview')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div id="import-preview-body" class="modal-body"></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="UI.closeModal('modal-import-preview')">Hủy bỏ</button>
        <button class="btn btn-outline" onclick="UI.executeImport('merge')">Gộp dữ liệu (Giữ cũ + Thêm mới)</button>
        <button class="btn btn-danger" onclick="UI.executeImport('replace')">Thay thế toàn bộ dữ liệu</button>
      </div>
    </div>
  </div>

  <!-- MODAL: CONFIRM DELETE -->
  <div id="modal-confirm-delete" class="modal-backdrop">
    <div class="modal-dialog" style="max-width:440px;">
      <div class="modal-header">
        <h3 id="confirm-delete-title" class="modal-title" style="color:var(--danger)">Xác nhận xóa</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-confirm-delete')">✕</button>
      </div>
      <div class="modal-body">
        <p id="confirm-delete-msg" style="font-size:13.5px; color:var(--text-main); line-height:1.5;"></p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="UI.closeModal('modal-confirm-delete')">Hủy bỏ</button>
        <button id="btn-confirm-delete-action" class="btn btn-danger">Đồng ý xóa</button>
      </div>
    </div>
  </div>

  <!-- MODAL: DANGER RESET CONFIRMATION -->
  <div id="modal-danger-reset" class="modal-backdrop">
    <div class="modal-dialog" style="max-width:460px;">
      <div class="modal-header">
        <h3 class="modal-title" style="color:var(--danger)">CẢNH BÁO: XÓA TOÀN BỘ DỮ LIỆU</h3>
        <button class="modal-close" onclick="UI.closeModal('modal-danger-reset')">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13.5px; color:#B91C1C; line-height:1.5; margin-bottom:14px;">
          Hành động này sẽ xóa vĩnh viễn toàn bộ đợt thi thử, ghi chú, lịch sử luyện tập và đặt lại toàn bộ cài đặt về trạng thái ban đầu.
        </p>
        <p style="font-size:13px; margin-bottom:8px;">Để xác nhận, vui lòng nhập chính xác cụm từ <strong>XOA DU LIEU</strong> vào ô bên dưới:</p>
        <input id="danger-reset-phrase" type="text" class="form-control" placeholder="Nhập: XOA DU LIEU">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="UI.closeModal('modal-danger-reset')">Hủy bỏ</button>
        <button class="btn btn-danger" onclick="UI.executeDangerReset()">Xác nhận xóa vĩnh viễn</button>
      </div>
    </div>
  </div>

  <!-- EMBEDDED DEFAULT TOPICS DATA -->
  <script>
    window.DEFAULT_TOPICS = {topics_json};
  </script>

  <!-- JAVASCRIPT APPLICATION CODE -->
  <script>
{JS_CONTENT}
  </script>
</body>
</html>
"""

    output_path = os.path.join(os.path.dirname(__file__), 'index.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Successfully generated {output_path} with size {len(html)} bytes")

if __name__ == '__main__':
    build_index_html()
