import type { Env, MyAgentMethods } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for browser access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get or create Durable Object instance (one per user session)
    const sessionId = url.searchParams.get('session') || 'default-user';
    const id = env.MyAgent.idFromName(sessionId);
    const agent = env.MyAgent.get(id) as unknown as MyAgentMethods;

    // ==================== CHAT ENDPOINT ====================
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const { message, mode } = await request.json() as { message: string; mode: 'study_helper' | 'planner' };
      
      // Get chat history for context
      const history = await agent.getChatHistory(10, mode);
      
      // Define AI tools - these describe what the AI can do
      const tools = [
        // ==================== PROFILE & PREFERENCES ====================
        {
          name: 'set_user_profile',
          description: 'Set or update student profile information (name, major, year, university, GPA, timezone, study goals)',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Student full name' },
              major: { type: 'string', description: 'Academic major/field of study' },
              year: { 
                type: 'string', 
                enum: ['freshman', 'sophomore', 'junior', 'senior', 'graduate'],
                description: 'Current year in school' 
              },
              university: { type: 'string', description: 'University or college name' },
              gpa: { type: 'number', description: 'Current GPA (0.0-4.0 scale)' },
              timezone: { type: 'string', description: 'Timezone (e.g., America/New_York, Europe/London)' },
              study_goal_hours_per_week: { type: 'number', description: 'Weekly study goal in hours' }
            }
          }
        },
        {
          name: 'get_user_profile',
          description: 'Get current student profile information',
          parameters: { type: 'object', properties: {} }
        },
        {
          name: 'set_preferences',
          description: 'Set user preferences (theme, notifications, reminder time, default priority)',
          parameters: {
            type: 'object',
            properties: {
              theme: { type: 'string', enum: ['light', 'dark'], description: 'UI theme preference' },
              notifications_enabled: { type: 'boolean', description: 'Enable/disable notifications' },
              reminder_time: { type: 'string', description: 'Default reminder time (HH:MM format)' },
              default_priority: { 
                type: 'string', 
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Default priority for new tasks' 
              }
            }
          }
        },
        {
          name: 'get_full_context',
          description: 'Get complete student context including profile, preferences, courses, knowledge base, and recent study sessions. Use this before answering study-related questions.',
          parameters: { type: 'object', properties: {} }
        },

        // ==================== ACADEMIC TASKS ====================
        {
          name: 'add_academic_task',
          description: 'Add a new academic task (lecture, quiz, exam, lab, assignment, self-study session, or deadline). Parse dates naturally from user input.',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['lecture', 'quiz', 'exam', 'lab', 'assignment', 'selfstudy', 'deadline'],
                description: 'Type of academic task'
              },
              course_code: { type: 'string', description: 'Course code (e.g., CS101, MATH201)' },
              course_name: { type: 'string', description: 'Full course name' },
              title: { type: 'string', description: 'Task title' },
              description: { type: 'string', description: 'Detailed description' },
              due_date: { type: 'string', description: 'Due date/time in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)' },
              duration_minutes: { type: 'number', description: 'Duration for lectures or study sessions' },
              location: { type: 'string', description: 'Physical or virtual location (for lectures/labs)' },
              priority: { 
                type: 'string', 
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Task priority level'
              }
            },
            required: ['type', 'title']
          }
        },
        {
          name: 'get_academic_tasks',
          description: 'Get academic tasks with optional filters. Use to show tasks, check schedule, or find specific assignments.',
          parameters: {
            type: 'object',
            properties: {
              status: { 
                type: 'string', 
                enum: ['pending', 'in_progress', 'completed', 'cancelled'],
                description: 'Filter by completion status' 
              },
              course_code: { type: 'string', description: 'Filter by specific course' },
              type: { type: 'string', description: 'Filter by task type' },
              upcoming_days: { type: 'number', description: 'Get tasks due in next N days' }
            }
          }
        },
        {
          name: 'update_academic_task',
          description: 'Update an existing academic task (change status, dates, details, etc.)',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Task ID to update' },
              updates: { 
                type: 'object', 
                description: 'Fields to update (status, priority, due_date, grade, notes, etc.)',
                additionalProperties: true
              }
            },
            required: ['id', 'updates']
          }
        },

        // ==================== PROFESSIONAL TASKS ====================
        {
          name: 'add_professional_task',
          description: 'Add a professional/career task (job application, internship, online course, certification, interview, networking event)',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['application', 'course', 'certification', 'interview', 'networking', 'deadline'],
                description: 'Type of professional task'
              },
              title: { type: 'string', description: 'Task title' },
              company_organization: { type: 'string', description: 'Company name or organization' },
              position_role: { type: 'string', description: 'Job position or course name' },
              description: { type: 'string', description: 'Detailed description' },
              deadline: { type: 'string', description: 'Application deadline in ISO 8601 format' },
              status: {
                type: 'string',
                enum: ['not_started', 'in_progress', 'applied', 'interviewing', 'offer', 'accepted', 'rejected', 'completed'],
                description: 'Current status'
              },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
              application_url: { type: 'string', description: 'URL to application portal' },
              contact_info: { type: 'string', description: 'Recruiter or contact information' },
              salary_compensation: { type: 'string', description: 'Salary range or compensation details' }
            },
            required: ['type', 'title']
          }
        },
        {
          name: 'get_professional_tasks',
          description: 'Get professional tasks with optional filters (applications, courses, certifications, interviews)',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Filter by status' },
              type: { type: 'string', description: 'Filter by task type' },
              company_organization: { type: 'string', description: 'Filter by company/organization name' },
              upcoming_days: { type: 'number', description: 'Get tasks with deadlines in next N days' }
            }
          }
        },
        {
          name: 'update_professional_task',
          description: 'Update a professional task (status, deadline, notes, etc.)',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Task ID to update' },
              updates: { type: 'object', additionalProperties: true }
            },
            required: ['id', 'updates']
          }
        },

        // ==================== COURSES ====================
        {
          name: 'add_course',
          description: 'Add a new course to the student\'s course catalog',
          parameters: {
            type: 'object',
            properties: {
              course_code: { type: 'string', description: 'Unique course code (e.g., CS101)' },
              course_name: { type: 'string', description: 'Full course name' },
              instructor: { type: 'string', description: 'Instructor/professor name' },
              semester: { type: 'string', description: 'Semester (e.g., Fall 2025, Spring 2026)' },
              credits: { type: 'number', description: 'Credit hours' },
              description: { type: 'string', description: 'Course description' },
              topics_covered: { type: 'string', description: 'Comma-separated list of topics' }
            },
            required: ['course_code', 'course_name']
          }
        },
        {
          name: 'get_courses',
          description: 'Get student\'s courses (active, completed, or dropped)',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['active', 'completed', 'dropped'] },
              semester: { type: 'string', description: 'Filter by semester' }
            }
          }
        },

        // ==================== STUDY SESSIONS & KNOWLEDGE ====================
        {
          name: 'log_study_session',
          description: 'Log a study session to track learning progress and build knowledge base. Always use this after discussing study topics.',
          parameters: {
            type: 'object',
            properties: {
              course_code: { type: 'string', description: 'Course being studied' },
              topic: { type: 'string', description: 'Main topic studied' },
              subtopics: { type: 'string', description: 'Comma-separated subtopics' },
              duration_minutes: { type: 'number', description: 'Study session duration' },
              session_type: {
                type: 'string',
                enum: ['lecture_review', 'practice', 'reading', 'problem_solving', 'group_study'],
                description: 'Type of study activity'
              },
              understanding_level: {
                type: 'string',
                enum: ['struggling', 'partial', 'good', 'excellent'],
                description: 'How well the topic was understood'
              },
              key_concepts: { type: 'string', description: 'Key concepts or facts learned' },
              questions_raised: { type: 'string', description: 'Areas of confusion or follow-up questions' },
              notes: { type: 'string', description: 'Additional notes' }
            },
            required: ['topic']
          }
        },
        {
          name: 'get_study_sessions',
          description: 'Get past study sessions (to review what was studied)',
          parameters: {
            type: 'object',
            properties: {
              course_code: { type: 'string' },
              topic: { type: 'string' },
              last_n_days: { type: 'number', description: 'Sessions from last N days' }
            }
          }
        },
        {
          name: 'get_knowledge_base',
          description: 'Get student\'s knowledge base (what topics they know and proficiency levels). Use this in study_helper mode to tailor explanations.',
          parameters: {
            type: 'object',
            properties: {
              course_code: { type: 'string', description: 'Optional: filter by specific course' }
            }
          }
        },

        // ==================== COMBINED QUERIES ====================
        {
          name: 'get_all_upcoming',
          description: 'Get all upcoming tasks from BOTH academic and professional categories. Use when user asks "what\'s coming up" without specifying category.',
          parameters: {
            type: 'object',
            properties: {
              days: { type: 'number', description: 'Number of days to look ahead (default: 7)' }
            }
          }
        }
      ];

      // System prompts for each mode
      const systemPrompts = {
        study_helper: `You are an intelligent academic study assistant. Your role is to:
- Help students understand concepts and solve problems
- Provide explanations tailored to their knowledge level (use get_full_context and get_knowledge_base)
- Track what they're learning (always log_study_session after teaching)
- Identify areas where they struggle and provide targeted help
- Reference their previous study sessions to build on prior knowledge
- Be encouraging and supportive

When answering study questions, ALWAYS:
1. First call get_full_context or get_knowledge_base to understand what they already know
2. Tailor your explanation to their proficiency level
3. After explaining, call log_study_session to record what was taught`,

        planner: `You are a student planner and productivity assistant. Your role is to:
- Parse natural language into structured tasks (dates, times, priorities)
- Organize academic tasks (lectures, quizzes, exams, labs, assignments, deadlines)
- Track professional tasks (job applications, courses, certifications, interviews)
- Provide overview of upcoming obligations
- Help prioritize and manage workload

Be proactive:
- When user mentions a task, immediately create it with add_academic_task or add_professional_task
- Parse dates naturally ("next Friday" = calculate ISO date)
- Ask clarifying questions if needed (course code, priority, etc.)
- Suggest get_all_upcoming to show their schedule`
      };

      const systemPrompt = systemPrompts[mode] || 'You are a helpful student assistant.';

      // Build messages array with history
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((h: any) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
      ];

      // Call Workers AI with tools
      const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages,
        tools,
        temperature: 0.7,
        max_tokens: 2048
      });

      // Handle tool calls from AI
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolResults = [];
        
        for (const toolCall of response.tool_calls) {
          let result;
          
          try {
            switch (toolCall.name) {
              // Profile & Preferences
              case 'set_user_profile':
                result = await agent.setUserProfile(toolCall.arguments);
                break;
              case 'get_user_profile':
                result = await agent.getUserProfile();
                break;
              case 'set_preferences':
                result = await agent.setPreferences(toolCall.arguments);
                break;
              case 'get_full_context':
                result = await agent.getFullContext();
                break;

              // Academic Tasks
              case 'add_academic_task':
                result = await agent.addAcademicTask(toolCall.arguments);
                break;
              case 'get_academic_tasks':
                result = await agent.getAcademicTasks(toolCall.arguments);
                break;
              case 'update_academic_task':
                result = await agent.updateAcademicTask(toolCall.arguments.id, toolCall.arguments.updates);
                break;

              // Professional Tasks
              case 'add_professional_task':
                result = await agent.addProfessionalTask(toolCall.arguments);
                break;
              case 'get_professional_tasks':
                result = await agent.getProfessionalTasks(toolCall.arguments);
                break;
              case 'update_professional_task':
                result = await agent.updateProfessionalTask(toolCall.arguments.id, toolCall.arguments.updates);
                break;

              // Courses
              case 'add_course':
                result = await agent.addCourse(toolCall.arguments);
                break;
              case 'get_courses':
                result = await agent.getCourses(toolCall.arguments);
                break;

              // Study Sessions & Knowledge
              case 'log_study_session':
                result = await agent.logStudySession(toolCall.arguments);
                break;
              case 'get_study_sessions':
                result = await agent.getStudySessions(toolCall.arguments);
                break;
              case 'get_knowledge_base':
                result = await agent.getKnowledgeBase(toolCall.arguments?.course_code);
                break;

              // Combined Queries
              case 'get_all_upcoming':
                result = await agent.getAllUpcoming(toolCall.arguments?.days || 7);
                break;

              default:
                result = { error: 'Unknown tool' };
            }
          } catch (error: any) {
            result = { error: error.message };
          }
          
          toolResults.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify(result)
          });
        }

        // Second AI call with tool results to generate final response
        const finalResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            ...messages,
            { 
              role: 'assistant', 
              content: response.response || '', 
              tool_calls: response.tool_calls 
            },
            ...toolResults.map(tr => ({
              role: 'tool',
              tool_call_id: tr.tool_call_id,
              content: tr.output
            }))
          ],
          temperature: 0.7,
          max_tokens: 2048
        });

        // Store conversation in chat history
        await agent.addChatMessage(mode, 'user', message);
        await agent.addChatMessage(mode, 'assistant', finalResponse.response);

        return new Response(JSON.stringify({ 
          response: finalResponse.response,
          tool_calls: response.tool_calls,
          tool_results: toolResults
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // No tool calls - direct response
      await agent.addChatMessage(mode, 'user', message);
      await agent.addChatMessage(mode, 'assistant', response.response);

      return new Response(JSON.stringify({ 
        response: response.response 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ==================== SIMPLE API ENDPOINTS ====================
    
    // Get upcoming tasks
    if (url.pathname === '/api/upcoming' && request.method === 'GET') {
      const days = parseInt(url.searchParams.get('days') || '7');
      const tasks = await agent.getAllUpcoming(days);
      return new Response(JSON.stringify(tasks), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update profile
    if (url.pathname === '/api/profile' && request.method === 'POST') {
      try {
        const payload = await request.json();
        await agent.setUserProfile(payload);
        const profile = await agent.getUserProfile();

        return new Response(JSON.stringify(profile), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Profile update failed', error);
        return new Response(JSON.stringify({ error: 'Invalid profile payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get profile
    if (url.pathname === '/api/profile' && request.method === 'GET') {
      const profile = await agent.getUserProfile();
      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { 
      status: 404, 
      headers: corsHeaders 
    });
  }
};

// Export the Durable Object class
export { MyAgent } from './agent.js';