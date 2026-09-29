export type Role = "employee" | "manager" | "hr_admin" | "system_admin";
export type Status = "Present" | "Late" | "Absent" | "On Leave" | "Holiday" | "Half Day";

export const roleLabels: Record<Role, string> = {
  employee: "Employee",
  manager: "Manager",
  hr_admin: "HR Admin",
  system_admin: "System Admin",
};

export const attendance = [
  { date: "29 Sep 2026", day: "Tuesday", checkIn: "08:57 AM", checkOut: "—", hours: "In progress", status: "Present" as Status },
  { date: "28 Sep 2026", day: "Monday", checkIn: "09:16 AM", checkOut: "05:42 PM", hours: "8h 26m", status: "Late" as Status },
  { date: "27 Sep 2026", day: "Sunday", checkIn: "—", checkOut: "—", hours: "—", status: "Holiday" as Status },
  { date: "26 Sep 2026", day: "Saturday", checkIn: "09:02 AM", checkOut: "05:35 PM", hours: "8h 33m", status: "Present" as Status },
  { date: "25 Sep 2026", day: "Friday", checkIn: "—", checkOut: "—", hours: "—", status: "On Leave" as Status },
  { date: "24 Sep 2026", day: "Thursday", checkIn: "09:41 AM", checkOut: "02:12 PM", hours: "4h 31m", status: "Half Day" as Status },
  { date: "23 Sep 2026", day: "Wednesday", checkIn: "—", checkOut: "—", hours: "—", status: "Absent" as Status },
];

export const employees = [
  { code: "DHA-1042", name: "Hamza Khan", department: "Operations", designation: "Operations Executive", shift: "General", status: "Active" },
  { code: "DHA-1017", name: "Ayesha Malik", department: "Human Resources", designation: "HR Manager", shift: "General", status: "Active" },
  { code: "DHA-1068", name: "Bilal Ahmed", department: "Finance", designation: "Accounts Officer", shift: "General", status: "Active" },
  { code: "DHA-1091", name: "Sara Ali", department: "Operations", designation: "Team Lead", shift: "Early", status: "Active" },
  { code: "DHA-1104", name: "Usman Raza", department: "Finance", designation: "Finance Assistant", shift: "General", status: "Inactive" },
];

export const leaveRequests = [
  { id: 1, employee: "Hamza Khan", type: "Annual Leave", dates: "05–07 Oct 2026", days: 3, reason: "Family commitment", status: "Pending" },
  { id: 2, employee: "Sara Ali", type: "Sick Leave", dates: "28–29 Sep 2026", days: 2, reason: "Medical rest", status: "Pending" },
  { id: 3, employee: "Bilal Ahmed", type: "Casual Leave", dates: "21 Sep 2026", days: 1, reason: "Personal appointment", status: "Approved" },
];

export const team = [
  { name: "Sara Ali", code: "DHA-1091", department: "Operations", checkIn: "08:51 AM", status: "Present" as Status },
  { name: "Hamza Khan", code: "DHA-1042", department: "Operations", checkIn: "08:57 AM", status: "Present" as Status },
  { name: "Ali Hassan", code: "DHA-1073", department: "Operations", checkIn: "09:18 AM", status: "Late" as Status },
  { name: "Mariam Noor", code: "DHA-1088", department: "Operations", checkIn: "—", status: "On Leave" as Status },
  { name: "Zain Siddiqui", code: "DHA-1112", department: "Operations", checkIn: "—", status: "Absent" as Status },
];

export const auditItems = [
  { action: "Attendance corrected", actor: "Sara Ali", target: "DHA-1042 · 24 Sep", time: "29 Sep, 11:42 AM" },
  { action: "Employee deactivated", actor: "Ayesha Malik", target: "DHA-1104 · Usman Raza", time: "28 Sep, 04:18 PM" },
  { action: "Leave request approved", actor: "Sara Ali", target: "DHA-1068 · Casual Leave", time: "22 Sep, 10:05 AM" },
  { action: "Shift updated", actor: "Ayesha Malik", target: "General Shift", time: "20 Sep, 03:30 PM" },
];