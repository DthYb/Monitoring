/**
 * TaskFlow - Module de gestion des tâches
 *
 * Ce module contient la logique métier de l'application.
 * Les données sont persistées dans le localStorage.
 */

const STORAGE_KEY = 'taskflow-tasks'

/**
 * Génère un ID unique pour une tâche
 * @returns {string} ID unique
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * Charge les tâches depuis le localStorage
 * @returns {Array} Liste des tâches
 */
export function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    console.error('Erreur lors du chargement des tâches')
    return []
  }
}

/**
 * Sauvegarde les tâches dans le localStorage
 * @param {Array} tasks - Liste des tâches à sauvegarder
 */
export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    console.error('Erreur lors de la sauvegarde des tâches')
  }
}

/**
 * Crée une nouvelle tâche
 * @param {string} text - Texte de la tâche
 * @param {string} priority - Priorité (low, medium, high)
 * @returns {Object} La nouvelle tâche créée
 */
export function createTask(text, priority = 'medium') {
  if (!text || typeof text !== 'string') {
    throw new Error('Le texte de la tâche est requis')
  }

  const trimmedText = text.trim()
  if (trimmedText.length === 0) {
    throw new Error('Le texte de la tâche ne peut pas être vide')
  }

  if (!['low', 'medium', 'high'].includes(priority)) {
    throw new Error('Priorité invalide')
  }

  return {
    id: generateId(),
    text: trimmedText,
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Ajoute une tâche à la liste
 * @param {Array} tasks - Liste actuelle des tâches
 * @param {Object} task - Tâche à ajouter
 * @returns {Array} Nouvelle liste avec la tâche ajoutée
 */
export function addTask(tasks, task) {
  return [...tasks, task]
}

/**
 * Supprime une tâche de la liste
 * @param {Array} tasks - Liste actuelle des tâches
 * @param {string} id - ID de la tâche à supprimer
 * @returns {Array} Nouvelle liste sans la tâche supprimée
 */
export function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id)
}

/**
 * Bascule l'état completed d'une tâche
 * @param {Array} tasks - Liste actuelle des tâches
 * @param {string} id - ID de la tâche à modifier
 * @returns {Array} Nouvelle liste avec la tâche modifiée
 */
export function toggleTask(tasks, id) {
  return tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
}

/**
 * Filtre les tâches selon leur état
 * @param {Array} tasks - Liste des tâches
 * @param {string} filter - Filtre à appliquer (all, active, completed)
 * @returns {Array} Liste filtrée
 */
export function filterTasks(tasks, filter) {
  switch (filter) {
    case 'active':
      return tasks.filter((task) => !task.completed)
    case 'completed':
      return tasks.filter((task) => task.completed)
    case 'all':
    default:
      return tasks
  }
}

/**
 * Supprime toutes les tâches terminées
 * @param {Array} tasks - Liste actuelle des tâches
 * @returns {Array} Liste sans les tâches terminées
 */
export function clearCompleted(tasks) {
  return tasks.filter((task) => !task.completed)
}

/**
 * Compte les tâches selon leur état
 * @param {Array} tasks - Liste des tâches
 * @returns {Object} Compteurs { total, active, completed }
 */
export function countTasks(tasks) {
  const total = tasks.length
  const completed = tasks.filter((task) => task.completed).length
  const active = total - completed

  return { total, active, completed }
}

/**
 * Trie les tâches par priorité (high > medium > low)
 * @param {Array} tasks - Liste des tâches
 * @returns {Array} Liste triée par priorité
 */
export function sortByPriority(tasks) {
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}
