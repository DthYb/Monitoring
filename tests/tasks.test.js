/**
 * Tests complets pour le module tasks.js
 *
 * SOLUTION FORMATEUR - Couverture >= 70%
 * Ces tests couvrent toutes les fonctions exportées du module.
 */

import { describe, it, expect } from 'vitest'
import {
  generateId,
  createTask,
  addTask,
  deleteTask,
  toggleTask,
  filterTasks,
  clearCompleted,
  countTasks,
  sortByPriority,
} from '../src/tasks.js'

// ─────────────────────────────────────────────────────────────────────────────
// generateId
// ─────────────────────────────────────────────────────────────────────────────
describe('generateId', () => {
  it('devrait générer un ID unique', () => {
    const id1 = generateId()
    const id2 = generateId()

    expect(id1).toBeDefined()
    expect(typeof id1).toBe('string')
    expect(id1.length).toBeGreaterThan(0)
    expect(id1).not.toBe(id2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createTask
// ─────────────────────────────────────────────────────────────────────────────
describe('createTask', () => {
  it('devrait créer une tâche avec les propriétés par défaut', () => {
    const task = createTask('Ma nouvelle tâche')

    expect(task).toHaveProperty('id')
    expect(task.text).toBe('Ma nouvelle tâche')
    expect(task.priority).toBe('medium')
    expect(task.completed).toBe(false)
    expect(task).toHaveProperty('createdAt')
  })

  it('devrait créer une tâche avec une priorité personnalisée', () => {
    const task = createTask('Tâche urgente', 'high')
    expect(task.priority).toBe('high')
  })

  it('devrait accepter la priorité low', () => {
    const task = createTask('Tâche basse priorité', 'low')
    expect(task.priority).toBe('low')
  })

  it('devrait trimmer le texte de la tâche', () => {
    const task = createTask('  Tâche avec espaces  ')
    expect(task.text).toBe('Tâche avec espaces')
  })

  it('devrait lever une erreur si le texte est vide', () => {
    expect(() => createTask('')).toThrow('Le texte de la tâche est requis')
  })

  it('devrait lever une erreur si le texte est uniquement des espaces', () => {
    expect(() => createTask('   ')).toThrow('Le texte de la tâche ne peut pas être vide')
  })

  it('devrait lever une erreur si le texte est null', () => {
    expect(() => createTask(null)).toThrow('Le texte de la tâche est requis')
  })

  it('devrait lever une erreur si le texte est undefined', () => {
    expect(() => createTask(undefined)).toThrow('Le texte de la tâche est requis')
  })

  it('devrait lever une erreur si le texte est un nombre', () => {
    expect(() => createTask(123)).toThrow('Le texte de la tâche est requis')
  })

  it('devrait lever une erreur si la priorité est invalide', () => {
    expect(() => createTask('Tâche', 'urgent')).toThrow('Priorité invalide')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// addTask
// ─────────────────────────────────────────────────────────────────────────────
describe('addTask', () => {
  it('devrait ajouter une tâche à une liste vide', () => {
    const tasks = []
    const newTask = createTask('Test')

    const result = addTask(tasks, newTask)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Test')
  })

  it('devrait ajouter une tâche à une liste non vide', () => {
    const tasks = [createTask('Tâche 1')]
    const newTask = createTask('Tâche 2')

    const result = addTask(tasks, newTask)

    expect(result).toHaveLength(2)
    expect(result[1].text).toBe('Tâche 2')
  })

  it('devrait préserver l\'immutabilité', () => {
    const tasks = [createTask('Tâche 1')]
    const newTask = createTask('Tâche 2')

    const result = addTask(tasks, newTask)

    expect(result).not.toBe(tasks)
    expect(tasks).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteTask
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteTask', () => {
  it('devrait supprimer une tâche existante', () => {
    const task1 = createTask('Tâche 1')
    const task2 = createTask('Tâche 2')
    const tasks = [task1, task2]

    const result = deleteTask(tasks, task1.id)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(task2.id)
  })

  it('devrait retourner la liste inchangée si l\'ID n\'existe pas', () => {
    const tasks = [createTask('Tâche 1')]

    const result = deleteTask(tasks, 'id-inexistant')

    expect(result).toHaveLength(1)
  })

  it('devrait préserver l\'immutabilité', () => {
    const task1 = createTask('Tâche 1')
    const tasks = [task1]

    const result = deleteTask(tasks, task1.id)

    expect(result).not.toBe(tasks)
  })

  it('devrait gérer une liste vide', () => {
    const result = deleteTask([], 'any-id')
    expect(result).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toggleTask
// ─────────────────────────────────────────────────────────────────────────────
describe('toggleTask', () => {
  it('devrait basculer une tâche de incomplete à complete', () => {
    const task = createTask('Tâche')
    const tasks = [task]

    const result = toggleTask(tasks, task.id)

    expect(result[0].completed).toBe(true)
  })

  it('devrait basculer une tâche de complete à incomplete', () => {
    const task = { ...createTask('Tâche'), completed: true }
    const tasks = [task]

    const result = toggleTask(tasks, task.id)

    expect(result[0].completed).toBe(false)
  })

  it('devrait ne pas modifier les autres tâches', () => {
    const task1 = createTask('Tâche 1')
    const task2 = createTask('Tâche 2')
    const tasks = [task1, task2]

    const result = toggleTask(tasks, task1.id)

    expect(result[1].completed).toBe(false)
  })

  it('devrait préserver l\'immutabilité', () => {
    const task = createTask('Tâche')
    const tasks = [task]

    const result = toggleTask(tasks, task.id)

    expect(result).not.toBe(tasks)
    expect(result[0]).not.toBe(task)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filterTasks
// ─────────────────────────────────────────────────────────────────────────────
describe('filterTasks', () => {
  const createTestTasks = () => {
    const active = createTask('Tâche active')
    const completed = { ...createTask('Tâche terminée'), completed: true }
    return [active, completed]
  }

  it('devrait retourner toutes les tâches avec le filtre "all"', () => {
    const tasks = createTestTasks()
    const result = filterTasks(tasks, 'all')
    expect(result).toHaveLength(2)
  })

  it('devrait retourner uniquement les tâches actives', () => {
    const tasks = createTestTasks()
    const result = filterTasks(tasks, 'active')
    expect(result).toHaveLength(1)
    expect(result[0].completed).toBe(false)
  })

  it('devrait retourner uniquement les tâches terminées', () => {
    const tasks = createTestTasks()
    const result = filterTasks(tasks, 'completed')
    expect(result).toHaveLength(1)
    expect(result[0].completed).toBe(true)
  })

  it('devrait retourner toutes les tâches par défaut', () => {
    const tasks = createTestTasks()
    const result = filterTasks(tasks, 'invalid-filter')
    expect(result).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// clearCompleted
// ─────────────────────────────────────────────────────────────────────────────
describe('clearCompleted', () => {
  it('devrait supprimer toutes les tâches terminées', () => {
    const active = createTask('Active')
    const completed = { ...createTask('Terminée'), completed: true }
    const tasks = [active, completed]

    const result = clearCompleted(tasks)

    expect(result).toHaveLength(1)
    expect(result[0].completed).toBe(false)
  })

  it('devrait retourner une liste vide si toutes les tâches sont terminées', () => {
    const completed1 = { ...createTask('T1'), completed: true }
    const completed2 = { ...createTask('T2'), completed: true }
    const tasks = [completed1, completed2]

    const result = clearCompleted(tasks)

    expect(result).toHaveLength(0)
  })

  it('devrait préserver l\'immutabilité', () => {
    const tasks = [createTask('Test')]
    const result = clearCompleted(tasks)
    expect(result).not.toBe(tasks)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// countTasks
// ─────────────────────────────────────────────────────────────────────────────
describe('countTasks', () => {
  it('devrait compter correctement les tâches', () => {
    const active = createTask('Active')
    const completed = { ...createTask('Terminée'), completed: true }
    const tasks = [active, completed]

    const result = countTasks(tasks)

    expect(result.total).toBe(2)
    expect(result.active).toBe(1)
    expect(result.completed).toBe(1)
  })

  it('devrait gérer une liste vide', () => {
    const result = countTasks([])

    expect(result.total).toBe(0)
    expect(result.active).toBe(0)
    expect(result.completed).toBe(0)
  })

  it('devrait gérer uniquement des tâches actives', () => {
    const tasks = [createTask('T1'), createTask('T2')]
    const result = countTasks(tasks)

    expect(result.total).toBe(2)
    expect(result.active).toBe(2)
    expect(result.completed).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sortByPriority
// ─────────────────────────────────────────────────────────────────────────────
describe('sortByPriority', () => {
  it('devrait trier les tâches par priorité (high > medium > low)', () => {
    const low = createTask('Low', 'low')
    const high = createTask('High', 'high')
    const medium = createTask('Medium', 'medium')
    const tasks = [low, medium, high]

    const result = sortByPriority(tasks)

    expect(result[0].priority).toBe('high')
    expect(result[1].priority).toBe('medium')
    expect(result[2].priority).toBe('low')
  })

  it('devrait préserver l\'immutabilité', () => {
    const tasks = [createTask('T1', 'low'), createTask('T2', 'high')]
    const result = sortByPriority(tasks)
    expect(result).not.toBe(tasks)
  })

  it('devrait gérer une liste vide', () => {
    const result = sortByPriority([])
    expect(result).toHaveLength(0)
  })

  it('devrait conserver l\'ordre pour des priorités égales', () => {
    const task1 = createTask('First', 'high')
    const task2 = createTask('Second', 'high')
    const tasks = [task1, task2]

    const result = sortByPriority(tasks)

    expect(result[0].text).toBe('First')
    expect(result[1].text).toBe('Second')
  })
})
