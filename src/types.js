/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string} phone
 * @property {'user' | 'admin'} role
 * @property {string} created_at
 * @property {string[]} skills
 * @property {string[]} languages
 * @property {string[]} tools
 * @property {string} [avatar]
 * @property {string} [bio]
 * @property {string} [portfolio_url]
 */

/**
 * @typedef {Object} TeamMember
 * @property {string} user_id
 * @property {string} name
 * @property {string} role
 * @property {string} joined_at
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} startup_id
 * @property {string} title
 * @property {string} description
 * @property {string} assigned_to_id
 * @property {string} assigned_to_name
 * @property {string} deadline
 * @property {'todo' | 'in-progress' | 'done'} status
 */

/**
 * @typedef {Object} Startup
 * @property {string} id
 * @property {string} nomi
 * @property {string} tavsif
 * @property {string} category
 * @property {string[]} kerakli_mutaxassislar
 * @property {string} logo
 * @property {string} egasi_id
 * @property {string} egasi_name
 * @property {'pending_admin' | 'approved' | 'rejected'} status
 * @property {string} yaratilgan_vaqt
 * @property {TeamMember[]} a_zolar
 * @property {Task[]} tasks
 * @property {number} views
 * @property {string} [github_url]
 * @property {string} [website_url]
 * @property {string} [rejection_reason]
 */

/**
 * @typedef {Object} JoinRequest
 * @property {string} id
 * @property {string} startup_id
 * @property {string} startup_name
 * @property {string} user_id
 * @property {string} user_name
 * @property {string} user_phone
 * @property {string} specialty
 * @property {string} comment
 * @property {'pending' | 'accepted' | 'declined'} status
 * @property {string} created_at
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {string} text
 * @property {'info' | 'success' | 'error'} type
 * @property {boolean} is_read
 * @property {string} created_at
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} text
 * @property {'user' | 'ai'} sender
 * @property {string} timestamp
 */

export {};
