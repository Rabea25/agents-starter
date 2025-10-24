import { Agent } from "agents";

export class MyAgent extends Agent {
  _tablesEnsured = false;

  execSql(query, ...bindings) {
    return this.ctx.storage.sql.exec(query, ...bindings);
  }
  
  // ==================== USER PROFILE (STATE) ====================
  
  async setUserProfile(profile) {
    // Store simple user info in key-value state
    const updates = {};

    if (profile.name !== undefined) updates.user_name = profile.name;
    if (profile.major !== undefined) updates.user_major = profile.major;
    if (profile.year !== undefined) updates.user_year = profile.year; // 'freshman', 'sophomore', etc.
    if (profile.university !== undefined) updates.user_university = profile.university;
    if (profile.gpa !== undefined) updates.user_gpa = profile.gpa;
    if (profile.timezone !== undefined) updates.user_timezone = profile.timezone;
    if (profile.study_goal_hours_per_week !== undefined) {
      updates.study_goal_hours_per_week = profile.study_goal_hours_per_week;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    updates.profile_updated_at = new Date().toISOString();
    await this.ctx.storage.put(updates);
  }

  async getUserProfile() {
    const keys = await this.ctx.storage.get([
      'user_name',
      'user_major',
      'user_year',
      'user_university',
      'user_gpa',
      'user_timezone',
      'study_goal_hours_per_week',
      'profile_updated_at'
    ]);

    return {
      name: keys.get('user_name'),
      major: keys.get('user_major'),
      year: keys.get('user_year'),
      university: keys.get('user_university'),
      gpa: keys.get('user_gpa'),
      timezone: keys.get('user_timezone') || 'UTC',
      study_goal_hours_per_week: keys.get('study_goal_hours_per_week'),
      profile_updated_at: keys.get('profile_updated_at')
    };
  }

  async setPreferences(prefs) {
    // Store user preferences
    const updates = {};

    if (prefs.theme !== undefined) updates.pref_theme = prefs.theme;
    if (prefs.notifications_enabled !== undefined) {
      updates.pref_notifications = prefs.notifications_enabled;
    }
    if (prefs.reminder_time !== undefined) updates.pref_reminder_time = prefs.reminder_time;
    if (prefs.default_priority !== undefined) updates.pref_default_priority = prefs.default_priority;

    if (Object.keys(updates).length === 0) {
      return;
    }

    await this.ctx.storage.put(updates);
  }

  async getPreferences() {
    const keys = await this.ctx.storage.get([
      'pref_theme',
      'pref_notifications',
      'pref_reminder_time',
      'pref_default_priority'
    ]);

    return {
      theme: keys.get('pref_theme') || 'light',
      notifications_enabled: keys.get('pref_notifications') ?? true,
      reminder_time: keys.get('pref_reminder_time') || '20:00',
      default_priority: keys.get('pref_default_priority') || 'medium'
    };
  }

  async getFullContext() {
    // Combine profile (state) + academic context (SQL) for AI
    const profile = await this.getUserProfile();
    const preferences = await this.getPreferences();
    const studentContext = await this.getStudentContext();
    
    return {
      profile,
      preferences,
      ...studentContext
    };
  }

  // ==================== SQL TABLES ====================
  
  async ensureTables() {
    if (this._tablesEnsured) {
      return;
    }

    // Academic tasks table
    this.execSql(`
      CREATE TABLE IF NOT EXISTS academic_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        course_code TEXT,
        course_name TEXT,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        duration_minutes INTEGER,
        location TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        grade TEXT,
        notes TEXT,
        tags TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
      )
    `);

    // Professional/Career tasks table
    this.execSql(`
      CREATE TABLE IF NOT EXISTS professional_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        company_organization TEXT,
        position_role TEXT,
        description TEXT,
        deadline TEXT,
        status TEXT DEFAULT 'not_started',
        priority TEXT DEFAULT 'medium',
        application_url TEXT,
        contact_info TEXT,
        salary_compensation TEXT,
        notes TEXT,
        tags TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
      )
    `);

    // Courses catalog
    this.execSql(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT UNIQUE NOT NULL,
        course_name TEXT NOT NULL,
        instructor TEXT,
        semester TEXT,
        credits INTEGER,
        status TEXT DEFAULT 'active',
        final_grade TEXT,
        description TEXT,
        topics_covered TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Study sessions
    this.execSql(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT,
        topic TEXT NOT NULL,
        subtopics TEXT,
        duration_minutes INTEGER,
        session_type TEXT,
        understanding_level TEXT,
        key_concepts TEXT,
        questions_raised TEXT,
        notes TEXT,
        session_date TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat history
    this.execSql(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mode TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        course_context TEXT,
        task_references TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Knowledge base
    this.execSql(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        topic TEXT NOT NULL,
        subtopic TEXT,
        proficiency_level TEXT DEFAULT 'beginner',
        last_studied TEXT,
        study_count INTEGER DEFAULT 1,
        notes TEXT,
        related_topics TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_code, topic, subtopic)
      )
    `);

    // Indexes
    this.execSql('CREATE INDEX IF NOT EXISTS idx_academic_due_date ON academic_tasks(due_date)');
    this.execSql('CREATE INDEX IF NOT EXISTS idx_academic_course ON academic_tasks(course_code)');
    this.execSql('CREATE INDEX IF NOT EXISTS idx_academic_status ON academic_tasks(status)');
    this.execSql('CREATE INDEX IF NOT EXISTS idx_professional_deadline ON professional_tasks(deadline)');
    this.execSql('CREATE INDEX IF NOT EXISTS idx_professional_status ON professional_tasks(status)');
    this.execSql('CREATE INDEX IF NOT EXISTS idx_chat_mode ON chat_history(mode)');
    this.execSql('CREATE INDEX IF NOT EXISTS idx_knowledge_course ON knowledge_base(course_code)');

    this._tablesEnsured = true;
  }

  // ==================== ACADEMIC TASKS ====================
  
  async addAcademicTask(task) {
    await this.ensureTables();
    
    const cursor = this.execSql(
      `INSERT INTO academic_tasks (type, course_code, course_name, title, description, due_date, 
        duration_minutes, location, priority, status, notes, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      task.type,
      task.course_code ?? null,
      task.course_name ?? null,
      task.title,
      task.description ?? null,
      task.due_date ?? null,
      task.duration_minutes ?? null,
      task.location ?? null,
      task.priority ?? 'medium',
      task.status ?? 'pending',
      task.notes ?? null,
      task.tags ?? null
    );

    const inserted = cursor.one();
    return { id: inserted.id, ...task };
  }

  async getAcademicTasks(filters = {}) {
    await this.ensureTables();
    
    let query = 'SELECT * FROM academic_tasks WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.course_code) {
      query += ' AND course_code = ?';
      params.push(filters.course_code);
    }
    
    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    
    if (filters.upcoming_days) {
      const future = new Date(Date.now() + filters.upcoming_days * 24 * 60 * 60 * 1000);
      query += ' AND due_date <= ? AND due_date >= ?';
      params.push(future.toISOString(), new Date().toISOString());
    }
    
    query += ' ORDER BY due_date ASC, priority DESC';
    
    const stmt = this.execSql(query, ...params);
    return stmt.toArray();
  }

  async updateAcademicTask(id, updates) {
    await this.ensureTables();
    
    const fields = [];
    const params = [];
    
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = ?`);
      params.push(updates[key]);
    });
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    if (updates.status === 'completed') {
      fields.push('completed_at = CURRENT_TIMESTAMP');
    }
    
    params.push(id);
    
    this.execSql(
      `UPDATE academic_tasks SET ${fields.join(', ')} WHERE id = ?`,
      ...params
    );
  }

  // ==================== PROFESSIONAL TASKS ====================
  
  async addProfessionalTask(task) {
    await this.ensureTables();
    
    const cursor = this.execSql(
      `INSERT INTO professional_tasks (type, title, company_organization, position_role, 
        description, deadline, status, priority, application_url, contact_info, 
        salary_compensation, notes, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      task.type,
      task.title,
      task.company_organization ?? null,
      task.position_role ?? null,
      task.description ?? null,
      task.deadline ?? null,
      task.status ?? 'not_started',
      task.priority ?? 'medium',
      task.application_url ?? null,
      task.contact_info ?? null,
      task.salary_compensation ?? null,
      task.notes ?? null,
      task.tags ?? null
    );

    const inserted = cursor.one();
    return { id: inserted.id, ...task };
  }

  async getProfessionalTasks(filters = {}) {
    await this.ensureTables();
    
    let query = 'SELECT * FROM professional_tasks WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    
    if (filters.company_organization) {
      query += ' AND company_organization LIKE ?';
      params.push(`%${filters.company_organization}%`);
    }
    
    if (filters.upcoming_days) {
      const future = new Date(Date.now() + filters.upcoming_days * 24 * 60 * 60 * 1000);
      query += ' AND deadline <= ? AND deadline >= ?';
      params.push(future.toISOString(), new Date().toISOString());
    }
    
    query += ' ORDER BY deadline ASC, priority DESC';
    
    const stmt = this.execSql(query, ...params);
    return stmt.toArray();
  }

  async updateProfessionalTask(id, updates) {
    await this.ensureTables();
    
    const fields = [];
    const params = [];
    
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = ?`);
      params.push(updates[key]);
    });
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    if (['accepted', 'rejected', 'completed'].includes(updates.status)) {
      fields.push('completed_at = CURRENT_TIMESTAMP');
    }
    
    params.push(id);
    
    this.execSql(
      `UPDATE professional_tasks SET ${fields.join(', ')} WHERE id = ?`,
      ...params
    );
  }

  // ==================== COURSES ====================
  
  async addCourse(course) {
    await this.ensureTables();
    
    const cursor = this.execSql(
      `INSERT INTO courses (course_code, course_name, instructor, semester, credits, 
        status, description, topics_covered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      course.course_code,
      course.course_name,
      course.instructor ?? null,
      course.semester ?? null,
      course.credits ?? null,
      course.status ?? 'active',
      course.description ?? null,
      course.topics_covered ?? null
    );

    const inserted = cursor.one();
    return { id: inserted.id, ...course };
  }

  async getCourses(filters = {}) {
    await this.ensureTables();
    
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.semester) {
      query += ' AND semester = ?';
      params.push(filters.semester);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = this.execSql(query, ...params);
    return stmt.toArray();
  }

  // ==================== STUDY SESSIONS ====================
  
  async logStudySession(session) {
    await this.ensureTables();
    
    const cursor = this.execSql(
      `INSERT INTO study_sessions (course_code, topic, subtopics, duration_minutes, 
        session_type, understanding_level, key_concepts, questions_raised, notes, session_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      session.course_code ?? null,
      session.topic,
      session.subtopics ?? null,
      session.duration_minutes ?? null,
      session.session_type ?? null,
      session.understanding_level ?? null,
      session.key_concepts ?? null,
      session.questions_raised ?? null,
      session.notes ?? null,
      session.session_date ?? new Date().toISOString()
    );
    
    // Update knowledge base
    if (session.course_code && session.topic) {
      await this.updateKnowledgeBase(
        session.course_code, 
        session.topic, 
        session.understanding_level,
        session.key_concepts
      );
    }
    
    const inserted = cursor.one();
    return { id: inserted.id, ...session };
  }

  async getStudySessions(filters = {}) {
    await this.ensureTables();
    
    let query = 'SELECT * FROM study_sessions WHERE 1=1';
    const params = [];
    
    if (filters.course_code) {
      query += ' AND course_code = ?';
      params.push(filters.course_code);
    }
    
    if (filters.topic) {
      query += ' AND topic LIKE ?';
      params.push(`%${filters.topic}%`);
    }
    
    if (filters.last_n_days) {
      const cutoff = new Date(Date.now() - filters.last_n_days * 24 * 60 * 60 * 1000);
      query += ' AND session_date >= ?';
      params.push(cutoff.toISOString());
    }
    
    query += ' ORDER BY session_date DESC';
    
    const stmt = this.execSql(query, ...params);
    return stmt.toArray();
  }

  // ==================== KNOWLEDGE BASE ====================
  
  async updateKnowledgeBase(course_code, topic, proficiency_level, notes) {
    await this.ensureTables();
    
    const existing = this.execSql(
      'SELECT * FROM knowledge_base WHERE course_code = ? AND topic = ?',
      course_code,
      topic
    );

    const rows = existing.toArray();
    
    if (rows.length > 0) {
      this.execSql(
        `UPDATE knowledge_base 
         SET proficiency_level = ?, last_studied = CURRENT_TIMESTAMP, 
             study_count = study_count + 1, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE course_code = ? AND topic = ?`,
        proficiency_level ?? rows[0].proficiency_level,
        notes !== undefined ? notes : rows[0].notes,
        course_code,
        topic
      );
    } else {
      this.execSql(
        `INSERT INTO knowledge_base (course_code, topic, proficiency_level, 
          last_studied, notes) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        course_code,
        topic,
        proficiency_level ?? 'beginner',
        notes ?? null
      );
    }
  }

  async getKnowledgeBase(course_code = null) {
    await this.ensureTables();
    
    let query = 'SELECT * FROM knowledge_base';
    const params = [];
    
    if (course_code) {
      query += ' WHERE course_code = ?';
      params.push(course_code);
    }
    
    query += ' ORDER BY last_studied DESC';
    
    const stmt = this.execSql(query, ...params);
    return stmt.toArray();
  }

  // ==================== CHAT HISTORY ====================
  
  async addChatMessage(mode, role, content, course_context = null, task_references = null) {
    await this.ensureTables();
    
    this.execSql(
      `INSERT INTO chat_history (mode, role, content, course_context, task_references) 
       VALUES (?, ?, ?, ?, ?)`,
      mode, role, content, course_context, task_references
    );
  }

  async getChatHistory(limit = 20, mode = null) {
    await this.ensureTables();
    
    let query = 'SELECT * FROM chat_history';
    const params = [];
    
    if (mode) {
      query += ' WHERE mode = ?';
      params.push(mode);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    const stmt = this.execSql(query, ...params);
    const results = stmt.toArray();
    return results.reverse();
  }

  // ==================== UNIFIED QUERIES ====================
  
  async getAllUpcoming(days = 7) {
    await this.ensureTables();
    
    const academic = await this.getAcademicTasks({ upcoming_days: days, status: 'pending' });
    const professional = await this.getProfessionalTasks({ upcoming_days: days });
    
    // Combine and sort by date
    const all = [
      ...academic.map(t => ({ ...t, category: 'academic' })),
      ...professional.map(t => ({ ...t, category: 'professional' }))
    ].sort((a, b) => {
      const dateA = new Date(a.due_date || a.deadline);
      const dateB = new Date(b.due_date || b.deadline);
      return dateA - dateB;
    });
    
    return all;
  }

  async getStudentContext(course_code = null) {
    await this.ensureTables();
    
    // Get courses
    const courses = await this.getCourses({ status: 'active' });
    
    // Get knowledge base (what they know)
    const knowledge = await this.getKnowledgeBase(course_code);
    
    // Get recent study sessions
    const recentStudy = await this.getStudySessions({ last_n_days: 30 });
    
    // Ensure recentStudy is an array
    const studyArray = Array.isArray(recentStudy) ? recentStudy : [];
    
    return {
      courses,
      knowledge,
      recent_study: studyArray,
      total_study_time: studyArray.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    };
  }
}

export default MyAgent;