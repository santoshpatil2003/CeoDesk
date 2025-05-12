// Utility to map user name to user object from workspace members
export function getUserByName(members, name) {
  if (!Array.isArray(members)) return null;
  return members.find(
    (member) => `${member.firstname} ${member.lastname}` === name || member.email === name
  );
}
