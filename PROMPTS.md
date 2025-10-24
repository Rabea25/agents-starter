1) "This agent will deal will be a general student assistant with 2 modes, a study helper which would be like a generic llm but more tailored to academic support and will keep track of what courses are learned and consider previous knowledge. The other mode is a planner / to do list. 
A student usually has their academic load: lectures, quizzes, exams, labs, selfstudy, assignments and general deadlines, and their load outside university: job/intern applications, courses, etc. The two loads should be stored and handled separately by the agent but the user can query for both without specifying.

Please show me the sql schema for the required tables for academic_tasks, professional_tasks, chat history and whatever else is needed with the study assistant mode, as well as any related tools associated with what I specified."

2) update index.ts and types.ts with the tools accordingly