# -*- coding: utf-8 -*-
"""
CSS styles for V-ACT Study Tracker
Follows White Minimal Dashboard aesthetic (Notion/Linear inspired)
Pure CSS3 with semantic custom properties, high contrast, clean typography, soft shadows.
"""

CSS_CONTENT = """
/* ==========================================================================
   V-ACT STUDY TRACKER — WHITE MINIMAL DASHBOARD STYLES
   ========================================================================== */

:root {
  --bg-main: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F1F5F9;
  --bg-subtle: #F1F5F9;
  
  --primary: #2563EB;
  --primary-hover: #1D4ED8;
  --primary-light: #EFF6FF;
  --primary-border: #BFDBFE;
  
  --text-main: #0F172A;
  --text-muted: #64748B;
  --text-light: #94A3B8;
  
  --border: #E2E8F0;
  --border-focus: #94A3B8;
  
  --success: #16A34A;
  --success-light: #DCFCE7;
  --success-border: #86EFAC;
  
  --warning: #F59E0B;
  --warning-light: #FEF3C7;
  --warning-border: #FCD34D;
  
  --danger: #EF4444;
  --danger-light: #FEE2E2;
  --danger-border: #FCA5A5;
  
  --subject-tv: #4F46E5;
  --subject-tv-light: #EEF2FF;
  --subject-en: #059669;
  --subject-en-light: #ECFDF5;
  --subject-ma: #D97706;
  --subject-ma-light: #FFFBEB;
  --subject-sc: #E11D48;
  --subject-sc-light: #FFF1F2;

  --sidebar-w: 260px;
  --header-h: 68px;
  --radius-sm: 6px;
  --radius: 12px;
  --radius-lg: 16px;
  
  --shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
  --shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04);
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  
  --transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg-main);
  color: var(--text-main);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  display: flex;
  overflow-x: hidden;
}

/* Scrollbars */
::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

/* ==========================================================================
   APP SHELL LAYOUT
   ========================================================================== */

#app-container {
  display: flex;
  width: 100%;
  min-height: 100vh;
}

/* Sidebar */
aside#sidebar {
  width: var(--sidebar-w);
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  transition: transform 0.25s ease;
}

.sidebar-header {
  height: var(--header-h);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-main);
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.5px;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.3px;
  display: flex;
  flex-direction: column;
}

.brand-sub {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}

.sidebar-nav {
  padding: 16px 12px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  transition: var(--transition);
  cursor: pointer;
  border: 1px solid transparent;
}

.nav-link svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
  color: inherit;
  flex-shrink: 0;
}

.nav-link:hover {
  background: var(--bg-subtle);
  color: var(--text-main);
}

.nav-link.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
  border-color: var(--primary-border);
}

.nav-badge {
  margin-left: auto;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  font-weight: 600;
}

.nav-link.active .nav-badge {
  background: var(--primary);
  color: #fff;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
  background: #FAFBFD;
}

.target-mini-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.target-mini-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.target-mini-score {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.target-mini-score span {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.progress-track {
  width: 100%;
  height: 6px;
  background: var(--bg-subtle);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 999px;
  transition: width 0.4s ease;
}

/* Main Content Area */
main#main-content {
  flex: 1;
  margin-left: var(--sidebar-w);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: calc(100% - var(--sidebar-w));
}

/* Header */
header#top-header {
  height: var(--header-h);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-mobile-menu {
  display: none;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px;
  cursor: pointer;
  color: var(--text-main);
}

.page-title-box h1 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--text-main);
}

.page-title-box p {
  font-size: 12.5px;
  color: var(--text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Auto-save Status Pill */
.save-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-muted);
  transition: var(--transition);
}

.save-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
}

.save-status-pill.saving .save-status-dot {
  background: var(--primary);
  animation: pulse 1s infinite;
}

.save-status-pill.error {
  border-color: var(--danger-border);
  color: var(--danger);
  background: var(--danger-light);
}

.save-status-pill.error .save-status-dot {
  background: var(--danger);
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}

/* Quick Add Dropdown */
.quick-add-container {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  width: 220px;
  padding: 6px;
  display: none;
  z-index: 50;
  flex-direction: column;
  gap: 2px;
}

.dropdown-menu.show {
  display: flex;
  animation: dropdownIn 0.15s ease-out;
}

@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-main);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  transition: var(--transition);
}

.dropdown-item svg {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
}

.dropdown-item:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.dropdown-item:hover svg {
  color: var(--primary);
}

.dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

/* Content Container */
.content-body {
  padding: 28px 32px 48px;
  max-width: 1380px;
  width: 100%;
  margin: 0 auto;
}

/* ==========================================================================
   COMMON COMPONENTS (Cards, Buttons, Inputs, Tables)
   ========================================================================== */

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  transition: var(--transition);
}

.card:hover {
  box-shadow: var(--shadow);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title svg {
  color: var(--text-muted);
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: normal;
  margin-top: 2px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
  white-space: nowrap;
  font-family: inherit;
}

.btn svg {
  width: 16px;
  height: 16px;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}
.btn-primary:hover {
  background: var(--primary-hover);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.btn-secondary {
  background: var(--bg-card);
  border-color: var(--border);
  color: var(--text-main);
}
.btn-secondary:hover {
  background: var(--bg-subtle);
  border-color: var(--border-focus);
}

.btn-outline {
  background: transparent;
  border-color: var(--border);
  color: var(--text-muted);
}
.btn-outline:hover {
  background: var(--bg-subtle);
  color: var(--text-main);
  border-color: var(--border-focus);
}

.btn-danger {
  background: var(--danger-light);
  color: var(--danger);
  border-color: var(--danger-border);
}
.btn-danger:hover {
  background: var(--danger);
  color: #fff;
}

.btn-icon {
  padding: 7px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}
.btn-icon:hover {
  background: var(--bg-subtle);
  color: var(--text-main);
}

/* Inputs, Selects, Textareas */
.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-label span.req {
  color: var(--danger);
  margin-left: 3px;
}

.form-label span.hint {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 400;
}

.form-control {
  width: 100%;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-main);
  font-size: 13.5px;
  font-family: inherit;
  transition: var(--transition);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.form-control::placeholder {
  color: var(--text-light);
}

textarea.form-control {
  min-height: 90px;
  resize: vertical;
  line-height: 1.5;
}

.input-group {
  display: flex;
  align-items: center;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-blue { background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary-border); }
.badge-green { background: var(--success-light); color: var(--success); border: 1px solid var(--success-border); }
.badge-yellow { background: var(--warning-light); color: var(--warning); border: 1px solid var(--warning-border); }
.badge-red { background: var(--danger-light); color: var(--danger); border: 1px solid var(--danger-border); }
.badge-gray { background: var(--bg-subtle); color: var(--text-muted); border: 1px solid var(--border); }

/* Subject tags */
.sub-tag-tv { background: var(--subject-tv-light); color: var(--subject-tv); border: 1px solid #C7D2FE; }
.sub-tag-en { background: var(--subject-en-light); color: var(--subject-en); border: 1px solid #A7F3D0; }
.sub-tag-ma { background: var(--subject-ma-light); color: var(--subject-ma); border: 1px solid #FDE68A; }
.sub-tag-sc { background: var(--subject-sc-light); color: var(--subject-sc); border: 1px solid #FECDD3; }

/* Filter Bar */
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-box input {
  padding-left: 36px;
}

.search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-light);
  pointer-events: none;
}

/* Tabs */
.tab-list {
  display: flex;
  border-bottom: 1px solid var(--border);
  gap: 4px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.tab-btn {
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-muted);
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--text-main);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

/* Tables */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

table.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
  background: var(--bg-card);
}

table.data-table th {
  background: #F8FAFC;
  padding: 11px 16px;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

table.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-main);
  vertical-align: middle;
}

table.data-table tr:last-child td {
  border-bottom: none;
}

table.data-table tbody tr:hover {
  background: #FAFBFD;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 14px;
  color: var(--text-light);
  stroke-width: 1.5;
}

.empty-state h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 6px;
}

.empty-state p {
  font-size: 13px;
  max-width: 420px;
  margin: 0 auto 18px;
  line-height: 1.5;
}

/* ==========================================================================
   VIEW 1 — OVERVIEW DASHBOARD
   ========================================================================== */

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.kpi-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.kpi-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Charts Section */
.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1080px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.chart-container {
  width: 100%;
  position: relative;
}

.svg-chart {
  width: 100%;
  height: 260px;
  overflow: visible;
}

/* Smart Insight Banner */
.insight-banner {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.insight-banner.warning {
  background: #FFFBEB;
  border-color: #FDE68A;
}

.insight-banner-icon {
  color: var(--warning);
  flex-shrink: 0;
  margin-top: 2px;
}

.insight-content h4 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 3px;
}

.insight-content p {
  font-size: 13px;
  color: #78350F;
  line-height: 1.45;
}

/* Two-column dashboard bottom */
.dashboard-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .dashboard-bottom-grid {
    grid-template-columns: 1fr;
  }
}

.attention-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  margin-bottom: 8px;
  background: var(--bg-card);
  transition: var(--transition);
}

.attention-item:hover {
  border-color: var(--border-focus);
  background: var(--bg-subtle);
}

.attention-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.attention-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
}

.attention-meta {
  font-size: 11.5px;
  color: var(--text-muted);
  display: flex;
  gap: 10px;
}

/* ==========================================================================
   VIEW 2 — CHUYÊN ĐỀ ÔN TẬP (TOPICS)
   ========================================================================== */

.subject-stats-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.subject-stat-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.subject-stat-pill strong {
  color: var(--text-main);
  font-size: 15px;
}

.group-accordion {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  margin-bottom: 16px;
  overflow: hidden;
}

.group-header {
  padding: 14px 20px;
  background: #FAFBFD;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: var(--transition);
  user-select: none;
}

.group-header:hover {
  background: var(--bg-subtle);
}

.group-header.expanded {
  border-bottom-color: var(--border);
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.group-count {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.group-body {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.topic-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
  background: var(--bg-card);
  transition: var(--transition);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
}

.topic-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.topic-card-top {
  margin-bottom: 12px;
}

.topic-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.topic-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.35;
}

.topic-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-size: 11.5px;
  color: var(--text-muted);
}

.mastery-dots {
  display: flex;
  gap: 3px;
}

.mastery-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
}

.mastery-dot.active {
  background: var(--warning);
}

/* ==========================================================================
   VIEW 3 — THI THỬ V-ACT (EXAMS) & 120-QUESTION MATRIX
   ========================================================================== */

.exam-mode-switch {
  display: flex;
  background: var(--bg-subtle);
  padding: 4px;
  border-radius: var(--radius-sm);
  gap: 4px;
  margin-bottom: 20px;
}

.exam-mode-btn {
  flex: 1;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-muted);
  transition: var(--transition);
}

.exam-mode-btn.active {
  background: var(--bg-card);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

/* Quick Mode Table Form */
.quick-exam-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.quick-exam-table th {
  background: #F8FAFC;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.quick-exam-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.quick-exam-table tr.total-row td {
  background: #FAFBFD;
  font-weight: 700;
  font-size: 14px;
}

/* Mode B: 120-Question Matrix Grid */
.matrix-section {
  margin-bottom: 24px;
}

.matrix-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.matrix-header h4 {
  font-size: 13.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.matrix-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.q-grid {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 6px;
}

@media (max-width: 1024px) {
  .q-grid {
    grid-template-columns: repeat(10, 1fr);
  }
}
@media (max-width: 600px) {
  .q-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.q-btn {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
  transition: var(--transition);
  position: relative;
  user-select: none;
}

.q-btn:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-sm);
  z-index: 2;
}

.q-btn.correct {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
}

.q-btn.wrong {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}

.q-btn.blank {
  background: #CBD5E1;
  border-color: #94A3B8;
  color: #1E293B;
}

.q-btn.ungraded {
  background: #F8FAFC;
  border-color: var(--border);
  color: var(--text-muted);
}

.q-btn.has-note::after {
  content: "";
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #FCD34D;
}

/* Wrong Question Detail Drawer/Card */
.wrong-q-panel {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: var(--radius);
  padding: 16px;
  margin-top: 14px;
}

/* ==========================================================================
   VIEW 4 — SỔ TAY GHI CHÚ (NOTEBOOK)
   ========================================================================== */

.notebook-layout {
  display: grid;
  grid-template-columns: 240px 340px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 1120px) {
  .notebook-layout {
    grid-template-columns: 320px 1fr;
  }
  .notebook-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .notebook-layout {
    grid-template-columns: 1fr;
  }
}

.note-card-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: var(--transition);
}

.note-card-item:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.note-card-item.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

.note-item-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
  line-height: 1.35;
}

.note-item-preview {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.note-detail-pane {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.note-callout-solution {
  background: #F0FDF4;
  border-left: 4px solid var(--success);
  padding: 14px 16px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  margin: 16px 0;
  font-size: 13.5px;
}

.note-callout-error {
  background: #FEF2F2;
  border-left: 4px solid var(--danger);
  padding: 14px 16px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  margin: 16px 0;
  font-size: 13.5px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.tag-chip {
  font-size: 11px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

/* ==========================================================================
   VIEW 5 — PHÂN TÍCH TIẾN BỘ (ANALYTICS)
   ========================================================================== */

.comparison-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 24px;
}

.delta-pill {
  font-weight: 700;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.delta-pill.pos { color: var(--success); }
.delta-pill.neg { color: var(--danger); }
.delta-pill.zero { color: var(--text-muted); }

/* Timeline Activity */
.timeline {
  position: relative;
  padding-left: 24px;
  margin-top: 16px;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--border);
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -24px;
  top: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 3px solid var(--primary);
}

.timeline-content {
  font-size: 13px;
}

.timeline-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

/* ==========================================================================
   MODALS & TOASTS
   ========================================================================== */

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.15s ease-out;
}

.modal-backdrop.show {
  display: flex;
}

.modal-dialog {
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 620px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalScale 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-dialog.modal-lg {
  max-width: 860px;
}

.modal-dialog.modal-xl {
  max-width: 1080px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.96) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  padding: 16px 22px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--bg-subtle);
  color: var(--text-main);
}

.modal-body {
  padding: 22px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 14px 22px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #FAFBFD;
}

/* Toast Notifications */
#toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  padding: 12px 16px;
  min-width: 280px;
  max-width: 380px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
  animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  transition: all 0.2s ease;
}

.toast.toast-success { border-left: 4px solid var(--success); }
.toast.toast-warning { border-left: 4px solid var(--warning); }
.toast.toast-error { border-left: 4px solid var(--danger); }
.toast.toast-info { border-left: 4px solid var(--primary); }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Mobile backdrop */
.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  z-index: 35;
  display: none;
}

.sidebar-backdrop.show {
  display: block;
}

/* ==========================================================================
   PRINT STYLES (@media print)
   ========================================================================== */

@media print {
  aside#sidebar,
  header#top-header,
  .btn,
  .modal-backdrop,
  #toast-container,
  .quick-add-container,
  .tab-list,
  .filter-bar {
    display: none !important;
  }
  
  main#main-content {
    margin-left: 0 !important;
    width: 100% !important;
  }
  
  .content-body {
    padding: 0 !important;
  }
  
  .card {
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    break-inside: avoid;
  }
}

/* Mobile Breakpoints */
@media (max-width: 768px) {
  aside#sidebar {
    transform: translateX(-100%);
  }
  aside#sidebar.mobile-open {
    transform: translateX(0);
  }
  main#main-content {
    margin-left: 0;
    width: 100%;
  }
  .btn-mobile-menu {
    display: inline-flex;
  }
  header#top-header {
    padding: 0 16px;
  }
  .content-body {
    padding: 16px;
  }
}
"""
