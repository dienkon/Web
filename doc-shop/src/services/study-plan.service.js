/**
 * Study Planner Service
 */
import { store } from "../app/state.js";
import { TargetExams } from "../app/constants.js";

const STORAGE_KEY_STUDY_TASKS = "dkdocshop_study_tasks";

class StudyPlanService {
  constructor() {
    this.loadTasks();
  }

  loadTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDY_TASKS);
      if (saved) {
        store.setStudyPlan({ tasks: JSON.parse(saved) });
      } else {
        const defaultTasks = [
          {
            id: "task_1",
            title: "Luyện 1 đề Toán THPT phần Hình học Oxyz",
            subject: "Toán Học",
            dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            priority: "high",
            completed: false,
            createdAt: Date.now(),
          },
          {
            id: "task_2",
            title: "Học 10 từ vựng Flashcard Tiếng Anh chủ đề Giáo Dục",
            subject: "Tiếng Anh",
            dueDate: new Date().toISOString().slice(0, 10),
            priority: "medium",
            completed: true,
            createdAt: Date.now() - 3600000,
          },
        ];
        store.setStudyPlan({ tasks: defaultTasks });
        this.persist(defaultTasks);
      }
    } catch (e) {
      console.warn("Failed to load study tasks:", e);
    }
  }

  persist(tasks) {
    localStorage.setItem(STORAGE_KEY_STUDY_TASKS, JSON.stringify(tasks));
  }

  addTask({ title, subject = "Toán Học", dueDate, priority = "medium" }) {
    const tasks = [...(store.getState().studyPlan.tasks || [])];
    const newTask = {
      id: `task_${Date.now()}`,
      title: title.trim(),
      subject,
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      priority,
      completed: false,
      createdAt: Date.now(),
    };
    tasks.unshift(newTask);
    store.setStudyPlan({ tasks });
    this.persist(tasks);
    return newTask;
  }

  toggleTask(taskId) {
    const tasks = (store.getState().studyPlan.tasks || []).map((t) => {
      if (t.id === taskId) return { ...t, completed: !t.completed };
      return t;
    });
    store.setStudyPlan({ tasks });
    this.persist(tasks);
  }

  deleteTask(taskId) {
    const tasks = (store.getState().studyPlan.tasks || []).filter((t) => t.id !== taskId);
    store.setStudyPlan({ tasks });
    this.persist(tasks);
  }

  getExamCountdowns() {
    const now = Date.now();
    return TargetExams.map((exam) => {
      const target = new Date(exam.targetDate).getTime();
      const diffMs = Math.max(0, target - now);

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        ...exam,
        days,
        hours,
        minutes,
        isPast: diffMs <= 0,
      };
    });
  }
}

export const studyPlanService = new StudyPlanService();
