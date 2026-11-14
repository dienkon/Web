/**
 * Google Apps Script (V8). Dán cùng hằng SURVEY ở phía trên vào Code.gs.
 * createChemDexSurvey: tạo bản nháp; openChemDexSurvey: công bố sau khi xem lại.
 * Script không gửi email, quay thưởng hoặc tự quyết định phiếu hợp lệ.
 */
function createChemDexSurvey() {
  validateChemDexSurvey_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const properties = PropertiesService.getScriptProperties();
  let form;
  let started = false;
  try {
    const existingId = properties.getProperty('CHEMDEX_FORM_ID');
    if (existingId) {
      form = FormApp.openById(existingId);
      const state = properties.getProperty('CHEMDEX_BUILD_STATE');
      if (state === 'ready') return logChemDexLinks_(form, properties);
      // Lỗi cài đặt ban đầu chưa tạo câu hỏi: dùng lại chính bản nháp đó.
      // Không xóa hoặc xây lại form đã có nội dung/phản hồi.
      if (['building', 'failed'].indexOf(state) < 0 || form.isPublished() ||
          form.getItems().length > 0 || form.getResponses().length > 0) {
        throw new Error('Bản tạo trước chưa hoàn tất nhưng không phải bản nháp trống. ' +
          'Nội dung và phản hồi được giữ nguyên. Kiểm tra tại ' + form.getEditUrl());
      }
      Logger.log('Tiếp tục tạo trên bản nháp trống: ' + form.getEditUrl());
    } else {
      form = FormApp.create(SURVEY.title, false);
    }
    started = true;
    properties.setProperties({
      CHEMDEX_FORM_ID: form.getId(),
      CHEMDEX_BUILD_STATE: 'building'
    });
    form.setAcceptingResponses(false)
      .setDescription(SURVEY.description)
      .setConfirmationMessage(SURVEY.confirmation)
      .setIsQuiz(false)
      .setProgressBar(true)
      .setShuffleQuestions(false)
      .setAllowResponseEdits(false)
      .setCollectEmail(false)
      .setLimitOneResponsePerUser(false)
      .setPublishingSummary(false)
      .setShowLinkToRespondAgain(false);

    // Giữ bảng đã tạo nếu đang phục hồi bản nháp trống.
    const existingSheetId = properties.getProperty('CHEMDEX_SHEET_ID');
    const sheet = existingSheetId ? SpreadsheetApp.openById(existingSheetId)
      : SpreadsheetApp.create('ChemDex — Phản hồi khảo sát 50 câu');
    properties.setProperty('CHEMDEX_SHEET_ID', sheet.getId());
    sheet.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

    const admin = SURVEY.admin;
    const consent = form.addMultipleChoiceItem()
      .setTitle(admin.consentTitle).setRequired(true);
    let firstPage;
    SURVEY.sections.forEach(function(section) {
      const page = form.addPageBreakItem().setTitle(section.title);
      if (section.description) page.setHelpText(section.description);
      if (!firstPage) firstPage = page;
      section.questions.forEach(function(question) {
        addChemDexQuestion_(form, question);
      });
    });
    consent.setChoices([
      consent.createChoice(admin.consentYes, firstPage),
      consent.createChoice(admin.consentNo, FormApp.PageNavigationType.SUBMIT)
    ]);

    form.addPageBreakItem().setTitle('Minigame — lựa chọn tham gia');
    const participate = form.addMultipleChoiceItem()
      .setTitle(admin.participateTitle).setRequired(true);
    const prizePage = form.addPageBreakItem()
      .setTitle('Minigame — đăng ký nhận thưởng')
      .setHelpText(admin.prizeDescription);
    participate.setChoices([
      participate.createChoice(admin.participateYes, prizePage),
      participate.createChoice(admin.participateNo, FormApp.PageNavigationType.SUBMIT)
    ]);
    form.addTextItem().setTitle(admin.gmailTitle).setRequired(true)
      .setHelpText('Nhập Gmail bạn đang sử dụng và có thể nhận thư, ví dụ tenban@gmail.com.')
      .setValidation(FormApp.createTextValidation()
        .requireTextMatchesPattern('^[A-Za-z0-9][A-Za-z0-9._%+\\-]*@[gG][mM][aA][iI][lL]\\.[cC][oO][mM]$')
        .setHelpText('Nhập địa chỉ kết thúc bằng @gmail.com, không có khoảng trắng.').build());
    form.addTextItem().setTitle(admin.nicknameTitle).setRequired(true)
      .setHelpText('Có thể dùng biệt danh; không cần ghi lớp, trường hoặc số điện thoại.')
      .setValidation(FormApp.createTextValidation()
        .requireTextMatchesPattern('.*\\S.*')
        .setHelpText('Nhập tên hoặc biệt danh, không chỉ nhập khoảng trắng.').build());
    form.addTextItem().setTitle(admin.luckyTitle).setRequired(true)
      .setHelpText('Chọn một số nguyên từ 1 đến 999. Ví dụ: 7, 168, 999. Không nhập 007 hoặc 1.5.')
      .setValidation(FormApp.createTextValidation()
        .requireTextMatchesPattern('^[1-9][0-9]{0,2}$')
        .setHelpText('Chỉ nhận số nguyên 1–999, không có dấu, khoảng trắng hoặc số 0 ở đầu.').build());
    form.addCheckboxItem().setTitle(admin.agreeTitle)
      .setChoiceValues([admin.agreeLabel]).setRequired(true);

    properties.setProperty('CHEMDEX_BUILD_STATE', 'ready');
    Logger.log('Đã tạo bản nháp đóng. Xem lại nội dung rồi chạy openChemDexSurvey để mở.');
    return logChemDexLinks_(form, properties);
  } catch (error) {
    if (started) {
      properties.setProperty('CHEMDEX_BUILD_STATE', 'failed');
      try { form.setAcceptingResponses(false); } catch (closeError) {
        Logger.log('Cần kiểm tra trạng thái Form thủ công: ' + closeError.message);
      }
    }
    throw error;
  } finally {
    lock.releaseLock();
  }
}

/** Chạy thủ công sau khi đã duyệt form và thể lệ. */
function openChemDexSurvey() {
  validateChemDexSurvey_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const form = getChemDexReadyForm_(properties);
    const closeAt = new Date(SURVEY.closeAt);
    if (closeAt.getTime() <= Date.now()) {
      form.setAcceptingResponses(false);
      throw new Error('Mốc đóng form đã qua. Kiểm tra closeAt và cập nhật thể lệ trước khi mở đợt mới.');
    }
    if (!form.supportsAdvancedResponderPermissions()) {
      throw new Error('Form này không hỗ trợ API công bố. Kiểm tra trạng thái trong giao diện Google Forms.');
    }
    // Tạo lịch trước khi mở. Trigger thời gian có thể chạy trễ;
    // khi duyệt giải phải đối chiếu timestamp với SURVEY.closeAt.
    const previousTriggerId = properties.getProperty('CHEMDEX_CLOSE_TRIGGER_ID');
    const trigger = ScriptApp.newTrigger('closeChemDexSurvey')
      .timeBased().at(closeAt).create();
    properties.setProperty('CHEMDEX_CLOSE_TRIGGER_ID', trigger.getUniqueId());
    try {
      form.setPublished(true);
      form.setAcceptingResponses(true);
      setChemDexClosedMessage_(form);
    } catch (error) {
      try { form.setAcceptingResponses(false); } catch (closeError) {
        Logger.log('Kiểm tra trạng thái Form thủ công: ' + closeError.message);
      }
      throw error;
    }
    removeChemDexTrigger_(previousTriggerId);
    Logger.log('Đã mở form. Mốc nhận phiếu theo thể lệ: ' + SURVEY.closeAt);
    return logChemDexLinks_(form, properties);
  } finally {
    lock.releaseLock();
  }
}

/** Có thể chạy thủ công; event được Google truyền vào khi lịch tự đóng chạy. */
function closeChemDexSurvey(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const triggerId = properties.getProperty('CHEMDEX_CLOSE_TRIGGER_ID');
    if (event && event.triggerUid && event.triggerUid !== triggerId) return;
    const form = getChemDexReadyForm_(properties);
    form.setAcceptingResponses(false);
    setChemDexClosedMessage_(form);
    removeChemDexTrigger_(triggerId);
    properties.deleteProperty('CHEMDEX_CLOSE_TRIGGER_ID');
    Logger.log('Đã đóng nhận phản hồi. Form và dữ liệu đã thu vẫn được giữ nguyên.');
  } finally {
    lock.releaseLock();
  }
}

function setChemDexClosedMessage_(form) {
  // Thông báo tùy chỉnh không cần cho bản nháp chưa xuất bản.
  // Một số form từ chối cập nhật này; vẫn giữ chức năng mở/đóng bình thường.
  try {
    if (form.isPublished()) form.setCustomClosedFormMessage(SURVEY.closedMessage);
  } catch (error) {
    Logger.log('Google chưa nhận thông báo đóng tùy chỉnh; dùng thông báo mặc định. ' +
      'Có thể sửa trong giao diện Forms. Chi tiết: ' + error.message);
  }
}

function addChemDexQuestion_(form, question) {
  let item;
  if (question.type === 'choice') {
    item = form.addMultipleChoiceItem().setChoiceValues(question.options);
  } else if (question.type === 'checkbox') {
    item = form.addCheckboxItem().setChoiceValues(question.options);
    if (question.maxChoices !== undefined) {
      item.setValidation(FormApp.createCheckboxValidation()
        .requireSelectAtMost(question.maxChoices)
        .setHelpText('Chọn tối đa ' + question.maxChoices + ' ý.').build());
    }
  } else {
    item = form.addParagraphTextItem();
  }
  item.setTitle(question.id + '. ' + question.title).setRequired(question.required);
  if (question.help) item.setHelpText(question.help);
}

function getChemDexReadyForm_(properties) {
  const id = properties.getProperty('CHEMDEX_FORM_ID');
  if (!id || properties.getProperty('CHEMDEX_BUILD_STATE') !== 'ready') {
    throw new Error('Chưa có form hoàn chỉnh. Chạy createChemDexSurvey trước và kiểm tra nhật ký.');
  }
  return FormApp.openById(id);
}

function logChemDexLinks_(form, properties) {
  const sheetId = properties.getProperty('CHEMDEX_SHEET_ID');
  const links = {
    edit: form.getEditUrl(),
    respond: form.getPublishedUrl(),
    responses: sheetId ? 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit' : ''
  };
  Logger.log(JSON.stringify(links, null, 2));
  return links;
}

function removeChemDexTrigger_(id) {
  if (!id) return;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getUniqueId() === id) ScriptApp.deleteTrigger(trigger);
  });
}

function validateChemDexSurvey_() {
  if (typeof SURVEY !== 'object' || SURVEY === null) throw new Error('Thiếu hằng SURVEY.');
  ['title', 'description', 'confirmation', 'closedMessage', 'closeAt'].forEach(function(key) {
    if (typeof SURVEY[key] !== 'string' || !SURVEY[key].trim()) throw new Error('Thiếu SURVEY.' + key);
  });
  if (!Number.isFinite(Date.parse(SURVEY.closeAt))) throw new Error('closeAt không phải ngày giờ hợp lệ.');
  if (!SURVEY.admin) throw new Error('Thiếu SURVEY.admin.');
  ['consentTitle', 'consentYes', 'consentNo', 'participateTitle', 'participateYes',
    'participateNo', 'gmailTitle', 'nicknameTitle', 'luckyTitle', 'agreeTitle',
    'agreeLabel', 'prizeDescription'].forEach(function(key) {
    if (typeof SURVEY.admin[key] !== 'string' || !SURVEY.admin[key].trim()) throw new Error('Thiếu admin.' + key);
  });
  if (!Array.isArray(SURVEY.sections) || !SURVEY.sections.length) throw new Error('Thiếu các phần khảo sát.');
  const questions = [];
  SURVEY.sections.forEach(function(section) {
    if (!section.title || !Array.isArray(section.questions) || !section.questions.length) {
      throw new Error('Mỗi phần phải có tiêu đề và câu hỏi.');
    }
    section.questions.forEach(function(question) { questions.push(question); });
  });
  if (questions.length !== 50) throw new Error('Phải có đúng 50 câu nghiên cứu; hiện có ' + questions.length);
  questions.forEach(function(question, index) {
    const expectedId = 'Q' + String(index + 1).padStart(2, '0');
    if (question.id !== expectedId || typeof question.title !== 'string' || !question.title.trim()) {
      throw new Error('Thiếu hoặc sai thứ tự câu ' + expectedId);
    }
    if (['choice', 'checkbox', 'paragraph'].indexOf(question.type) < 0 || typeof question.required !== 'boolean') {
      throw new Error('Sai kiểu hoặc trạng thái bắt buộc của ' + expectedId);
    }
    if (question.type !== 'paragraph') {
      if (!Array.isArray(question.options) || question.options.length < 2 ||
          question.options.some(function(option) { return typeof option !== 'string' || !option.trim(); }) ||
          new Set(question.options).size !== question.options.length) {
        throw new Error('Đáp án thiếu hoặc trùng ở ' + expectedId);
      }
    }
    if (question.maxChoices !== undefined && (question.type !== 'checkbox' ||
        !Number.isInteger(question.maxChoices) || question.maxChoices < 1 ||
        question.maxChoices > question.options.length)) {
      throw new Error('Giới hạn chọn không hợp lệ ở ' + expectedId);
    }
  });
}
