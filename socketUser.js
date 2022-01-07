const users = [];

// Join user to editing tool
async function  userJoin(id, username, room, projectId, questionCodebookId) {
  const user = { id, username, room, projectId, questionCodebookId };
  users.push(user);
  return user;
}

// Get current user
async function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

// User leaves editing tool
async function  userLeave(id) {
  const index = users.findIndex(user => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

// Get room users
async function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
};