/**
 * TaskFlow - Application principale
 *
 * Point d'entrée de l'application. Gère l'interface utilisateur
 * et les interactions avec le module tasks.js
 */

import {
  loadTasks,
  saveTasks,
  createTask,
  addTask,
  deleteTask,
  toggleTask,
  filterTasks,
  clearCompleted,
  countTasks,
} from './tasks.js'

// État de l'application
let tasks = []
let currentFilter = 'all'

// Éléments du DOM
const taskForm = document.getElementById('task-form')
const taskInput = document.getElementById('task-input')
const taskPriority = document.getElementById('task-priority')
const taskList = document.getElementById('task-list')
const taskCount = document.getElementById('task-count')
const clearCompletedBtn = document.getElementById('clear-completed')
const filterButtons = document.querySelectorAll('.filter-btn')

/**
 * Initialise l'application
 */
function init() {
  tasks = loadTasks()
  render()
  setupEventListeners()
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Soumission du formulaire
  taskForm.addEventListener('submit', handleSubmit)

  // Boutons de filtre
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter
      updateFilterButtons()
      render()
    })
  })

  // Bouton supprimer terminées
  clearCompletedBtn.addEventListener('click', handleClearCompleted)

  // Délégation d'événements pour la liste
  taskList.addEventListener('click', handleTaskClick)
  taskList.addEventListener('change', handleTaskChange)
}

/**
 * Gère la soumission du formulaire
 * @param {Event} e - Événement de soumission
 */
function handleSubmit(e) {
  e.preventDefault()

  const text = taskInput.value
  const priority = taskPriority.value

  try {
    const newTask = createTask(text, priority)
    tasks = addTask(tasks, newTask)
    saveTasks(tasks)
    render()
    taskInput.value = ''
    taskInput.focus()
  } catch (error) {
    alert(error.message)
  }
}

/**
 * Gère les clics sur les tâches (suppression)
 * @param {Event} e - Événement de clic
 */
function handleTaskClick(e) {
  if (e.target.classList.contains('task-delete')) {
    const id = e.target.closest('.task-item').dataset.id
    tasks = deleteTask(tasks, id)
    saveTasks(tasks)
    render()
  }
}

/**
 * Gère les changements sur les tâches (checkbox)
 * @param {Event} e - Événement de changement
 */
function handleTaskChange(e) {
  if (e.target.classList.contains('task-checkbox')) {
    const id = e.target.closest('.task-item').dataset.id
    tasks = toggleTask(tasks, id)
    saveTasks(tasks)
    render()
  }
}

/**
 * Gère la suppression des tâches terminées
 */
function handleClearCompleted() {
  tasks = clearCompleted(tasks)
  saveTasks(tasks)
  render()
}

/**
 * Met à jour l'état actif des boutons de filtre
 */
function updateFilterButtons() {
  filterButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === currentFilter)
  })
}

/**
 * Génère le HTML d'une tâche
 * @param {Object} task - Tâche à afficher
 * @returns {string} HTML de la tâche
 */
function renderTask(task) {
  const priorityLabels = {
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',
  }

  return `
    <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <input
        type="checkbox"
        class="task-checkbox"
        ${task.completed ? 'checked' : ''}
      >
      <span class="task-text">${escapeHtml(task.text)}</span>
      <span class="task-priority ${task.priority}">${priorityLabels[task.priority]}</span>
      <button class="task-delete" title="Supprimer">×</button>
    </li>
  `
}

/**
 * Échappe les caractères HTML dangereux
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Met à jour l'affichage
 */
function render() {
  const filteredTasks = filterTasks(tasks, currentFilter)
  const counts = countTasks(tasks)

  // Affichage de la liste
  if (filteredTasks.length === 0) {
    taskList.innerHTML = `
      <li class="empty-state">
        ${currentFilter === 'all' ? 'Aucune tâche pour le moment' : 'Aucune tâche dans cette catégorie'}
      </li>
    `
  } else {
    taskList.innerHTML = filteredTasks.map(renderTask).join('')
  }

  // Mise à jour du compteur
  const label = counts.active === 1 ? 'tâche restante' : 'tâches restantes'
  taskCount.textContent = `${counts.active} ${label}`

  // Affichage du bouton "Supprimer terminées"
  clearCompletedBtn.style.display = counts.completed > 0 ? 'block' : 'none'
}

// Démarrage de l'application
init()
