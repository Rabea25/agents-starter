// ==================== TYPE DEFINITIONS ====================

// User Profile
export interface UserProfile {
  name?: string;
  major?: string;
  year?: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate';
  university?: string;
  gpa?: number;
  timezone?: string;
  study_goal_hours_per_week?: number;
  profile_updated_at?: string;
}

// User Preferences
export interface UserPreferences {
  theme?: 'light' | 'dark';
  notifications_enabled?: boolean;
  reminder_time?: string;
  default_priority?: 'low' | 'medium' | 'high' | 'urgent';
}

// Academic Task
export interface AcademicTask {
  id?: number;
  type: 'lecture' | 'quiz' | 'exam' | 'lab' | 'assignment' | 'selfstudy' | 'deadline';
  course_code?: string;
  course_name?: string;
  title: string;
  description?: string;
  due_date?: string;
  duration_minutes?: number;
  location?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  grade?: string;
  notes?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

// Professional Task
export interface ProfessionalTask {
  id?: number;
  type: 'application' | 'course' | 'certification' | 'interview' | 'networking' | 'deadline';
  title: string;
  company_organization?: string;
  position_role?: string;
  description?: string;
  deadline?: string;
  status?: 'not_started' | 'in_progress' | 'applied' | 'interviewing' | 'offer' | 'accepted' | 'rejected' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  application_url?: string;
  contact_info?: string;
  salary_compensation?: string;
  notes?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

// Course
export interface Course {
  id?: number;
  course_code: string;
  course_name: string;
  instructor?: string;
  semester?: string;
  credits?: number;
  status?: 'active' | 'completed' | 'dropped';
  final_grade?: string;
  description?: string;
  topics_covered?: string;
  created_at?: string;
  updated_at?: string;
}

// Study Session
export interface StudySession {
  id?: number;
  course_code?: string;
  topic: string;
  subtopics?: string;
  duration_minutes?: number;
  session_type?: 'lecture_review' | 'practice' | 'reading' | 'problem_solving' | 'group_study';
  understanding_level?: 'struggling' | 'partial' | 'good' | 'excellent';
  key_concepts?: string;
  questions_raised?: string;
  notes?: string;
  session_date?: string;
  created_at?: string;
}

// Knowledge Base Entry
export interface KnowledgeEntry {
  id?: number;
  course_code: string;
  topic: string;
  subtopic?: string;
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  last_studied?: string;
  study_count?: number;
  notes?: string;
  related_topics?: string;
  created_at?: string;
  updated_at?: string;
}

// Chat Message
export interface ChatMessage {
  id?: number;
  mode: 'study_helper' | 'planner' | 'general';
  role: 'user' | 'assistant' | 'system';
  content: string;
  course_context?: string;
  task_references?: string;
  timestamp?: string;
}

// Student Context (combined data)
export interface StudentContext {
  courses: Course[];
  knowledge: KnowledgeEntry[];
  recent_study: StudySession[];
  total_study_time: number;
}

// Full Context (includes profile)
export interface FullContext extends StudentContext {
  profile: UserProfile;
  preferences: UserPreferences;
}

// ==================== DURABLE OBJECT INTERFACE ====================

// Define the interface for MyAgent Durable Object methods
export interface MyAgentMethods {
  // Profile & Preferences
  setUserProfile(profile: UserProfile): Promise<void>;
  getUserProfile(): Promise<UserProfile>;
  setPreferences(prefs: UserPreferences): Promise<void>;
  getPreferences(): Promise<UserPreferences>;
  getFullContext(): Promise<FullContext>;

  // Academic Tasks
  addAcademicTask(task: AcademicTask): Promise<AcademicTask>;
  getAcademicTasks(filters?: {
    status?: string;
    course_code?: string;
    type?: string;
    upcoming_days?: number;
  }): Promise<AcademicTask[]>;
  updateAcademicTask(id: number, updates: Partial<AcademicTask>): Promise<void>;

  // Professional Tasks
  addProfessionalTask(task: ProfessionalTask): Promise<ProfessionalTask>;
  getProfessionalTasks(filters?: {
    status?: string;
    type?: string;
    company_organization?: string;
    upcoming_days?: number;
  }): Promise<ProfessionalTask[]>;
  updateProfessionalTask(id: number, updates: Partial<ProfessionalTask>): Promise<void>;

  // Courses
  addCourse(course: Course): Promise<Course>;
  getCourses(filters?: {
    status?: string;
    semester?: string;
  }): Promise<Course[]>;

  // Study Sessions
  logStudySession(session: StudySession): Promise<StudySession>;
  getStudySessions(filters?: {
    course_code?: string;
    topic?: string;
    last_n_days?: number;
  }): Promise<StudySession[]>;

  // Knowledge Base
  updateKnowledgeBase(course_code: string, topic: string, proficiency_level?: string, notes?: string): Promise<void>;
  getKnowledgeBase(course_code?: string): Promise<KnowledgeEntry[]>;

  // Chat History
  addChatMessage(mode: string, role: string, content: string, course_context?: string, task_references?: string): Promise<void>;
  getChatHistory(limit?: number, mode?: string): Promise<ChatMessage[]>;

  // Combined Queries
  getAllUpcoming(days?: number): Promise<Array<AcademicTask | ProfessionalTask>>;
  getStudentContext(course_code?: string): Promise<StudentContext>;
}

// ==================== ENVIRONMENT BINDINGS ====================

export interface Env {
  AI: any;
  MyAgent: DurableObjectNamespace;
}
