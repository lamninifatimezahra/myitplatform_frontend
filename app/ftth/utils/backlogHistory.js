export function buildBacklogHistory(tickets, dateEntryField, dateExitField, retardDays = 7) {
  const events = [];

  (Array.isArray(tickets) ? tickets : []).forEach((ticket) => {
    const entryDate = ticket?.[dateEntryField]?.split("T")[0];
    const exitDate = ticket?.[dateExitField]?.split("T")[0];
    const ticketId = ticket?.id_ticket || ticket?.id;

    if (entryDate) events.push({ date: entryDate, type: "ENTRY", ticketId });
    if (exitDate) events.push({ date: exitDate, type: "EXIT", ticketId });
  });

  events.sort((left, right) => left.date.localeCompare(right.date));

  const backlogByDate = {};
  const backlogRetardByDate = {};
  const activeTickets = new Map();

  events.forEach(({ date, type, ticketId }) => {
    const eventDate = new Date(date);

    if (!Object.prototype.hasOwnProperty.call(backlogByDate, date)) {
      const previousDates = Object.keys(backlogByDate).sort();
      const lastDate = previousDates[previousDates.length - 1];
      backlogByDate[date] = lastDate ? backlogByDate[lastDate] : 0;
      backlogRetardByDate[date] = lastDate ? backlogRetardByDate[lastDate] : 0;
    }

    if (type === "ENTRY") activeTickets.set(ticketId, eventDate);
    else activeTickets.delete(ticketId);

    let overdueCount = 0;
    activeTickets.forEach((entryDate) => {
      const ageInDays = Math.ceil((eventDate - entryDate) / 86400000);
      if (ageInDays >= retardDays) overdueCount++;
    });

    backlogByDate[date] = Math.max(0, activeTickets.size);
    backlogRetardByDate[date] = Math.max(0, overdueCount);
  });

  return { backlogByDate, backlogRetardByDate };
}

export function getBacklogValuesForDates(dates, backlogByDate) {
  const knownDates = Object.keys(backlogByDate || {}).sort();

  return dates.map((date) => {
    if (Object.prototype.hasOwnProperty.call(backlogByDate, date)) {
      return Number(backlogByDate[date]) || 0;
    }

    for (let index = knownDates.length - 1; index >= 0; index--) {
      if (knownDates[index] < date) {
        return Number(backlogByDate[knownDates[index]]) || 0;
      }
    }

    return 0;
  });
}