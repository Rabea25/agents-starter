const chatLog = document.querySelector('#chat-log');
const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const modeSelect = document.querySelector('#mode');
const sessionIdLabel = document.querySelector('#session-id');
const resetSessionBtn = document.querySelector('#reset-session');
const upcomingBtn = document.querySelector('#refresh-upcoming');
const upcomingDaysInput = document.querySelector('#upcoming-days');
const upcomingList = document.querySelector('#upcoming-list');
const profileBtn = document.querySelector('#refresh-profile');
const profileDetails = document.querySelector('#profile-details');
const profileForm = document.querySelector('#profile-form');

const API_BASE = '';
const SESSION_KEY = 'student-agent-session-id';

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function setSessionId(id) {
  localStorage.setItem(SESSION_KEY, id);
  sessionIdLabel.textContent = id;
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function appendMessage(role, content) {
  const template = document.querySelector('#message-template');
  const element = template.content.firstElementChild.cloneNode(true);
  element.classList.add(role === 'user' ? 'user' : 'assistant');
  element.querySelector('.meta').textContent = role === 'user' ? 'You' : 'Agent';
  element.querySelector('.content').textContent = content.trim();
  chatLog.appendChild(element);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function sendChat(event) {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage('user', message);
  chatInput.value = '';

  try {
    appendMessage('assistant', 'Thinking...');
    const placeholder = chatLog.lastElementChild;

    const response = await fetch(`${API_BASE}/api/chat?session=${encodeURIComponent(getSessionId())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, mode: modeSelect.value })
    });

    if (!response.ok) {
      throw new Error(`Chat request failed (${response.status})`);
    }

    const data = await response.json();
    placeholder.querySelector('.content').textContent = data.response?.trim() || '(No response)';
    await refreshUpcoming();
  } catch (error) {
    console.error(error);
    appendMessage('assistant', `Error: ${error.message}`);
  }
}

function renderTasks(tasks) {
  upcomingList.innerHTML = '';
  if (!tasks?.length) {
    const li = document.createElement('li');
    li.textContent = 'No upcoming tasks.';
    upcomingList.appendChild(li);
    return;
  }

  const template = document.querySelector('#task-template');
  tasks.forEach((task) => {
    const li = template.content.firstElementChild.cloneNode(true);
    li.querySelector('.title').textContent = task.title || task.position_role || 'Untitled';
    li.querySelector('.badge').textContent = task.category ? task.category : (task.type || 'task');

    const details = [];
    if (task.course_code) details.push(task.course_code);
    if (task.company_organization) details.push(task.company_organization);
    if (task.priority) details.push(`priority: ${task.priority}`);
    if (task.status) details.push(`status: ${task.status}`);
    li.querySelector('.details').textContent = details.join(' • ') || '—';

    const date = task.due_date || task.deadline;
    li.querySelector('footer').textContent = date ? `Due ${formatDate(date)}` : 'No due date';

    upcomingList.appendChild(li);
  });
}

async function refreshUpcoming() {
  try {
    const days = parseInt(upcomingDaysInput.value, 10) || 7;
    const response = await fetch(`${API_BASE}/api/upcoming?days=${days}&session=${encodeURIComponent(getSessionId())}`);
    if (!response.ok) throw new Error('Failed to fetch upcoming tasks');
    const tasks = await response.json();
    renderTasks(tasks);
  } catch (error) {
    console.error(error);
    upcomingList.innerHTML = '<li>Unable to load tasks.</li>';
  }
}

function renderProfile(profile) {
  profileDetails.innerHTML = '';
  const entries = Object.entries(profile || {});
  if (!entries.length) {
    profileDetails.innerHTML = '<p>No profile data yet.</p>';
    return;
  }

  entries.forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    const dt = document.createElement('dt');
    dt.textContent = key.replaceAll('_', ' ');
    const dd = document.createElement('dd');
    dd.textContent = key.includes('date') ? formatDate(value) : String(value);
    profileDetails.append(dt, dd);
  });
}

async function refreshProfile() {
  try {
    const response = await fetch(`${API_BASE}/api/profile?session=${encodeURIComponent(getSessionId())}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    const profile = await response.json();
    renderProfile(profile);
  } catch (error) {
    console.error(error);
    profileDetails.innerHTML = '<p>Unable to load profile.</p>';
  }
}

async function updateProfile(event) {
  event.preventDefault();
  const formData = new FormData(profileForm);
  const payload = Object.fromEntries(
    Array.from(formData.entries())
      .filter(([, value]) => value !== '')
      .map(([key, value]) => [key, key === 'gpa' || key === 'study_goal_hours_per_week' ? Number(value) : value])
  );

  if (!Object.keys(payload).length) {
    alert('Fill at least one field to update the profile.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/profile?session=${encodeURIComponent(getSessionId())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to update profile');
    profileForm.reset();
    await refreshProfile();
  } catch (error) {
    console.error(error);
    alert('Unable to update profile');
  }
}

function resetSession() {
  const confirmed = confirm('Start a new session? Your previous conversation and memory will be lost.');
  if (!confirmed) return;
  chatLog.innerHTML = '';
  upcomingList.innerHTML = '';
  profileDetails.innerHTML = '';
  setSessionId(crypto.randomUUID());
  appendMessage('assistant', 'New session started. Say hi!');
}

function init() {
  const id = getSessionId();
  setSessionId(id);
  appendMessage('assistant', 'Welcome to Student Copilot! How can I help today?');
  refreshUpcoming();
  refreshProfile();

  chatForm.addEventListener('submit', sendChat);
  upcomingBtn.addEventListener('click', refreshUpcoming);
  profileBtn.addEventListener('click', refreshProfile);
  resetSessionBtn.addEventListener('click', resetSession);
  profileForm.addEventListener('submit', updateProfile);
}

document.addEventListener('DOMContentLoaded', init);
