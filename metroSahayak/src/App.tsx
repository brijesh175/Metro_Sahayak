import { useEffect, useMemo, useRef, useState } from "react";

type Department = "Operations" | "Housekeeping" | "Finance" | "Customer Service" | "Security";
type Urgency = "Critical" | "High" | "Medium" | "Low";
type Status = "New" | "Needs review" | "Assigned" | "In progress" | "Resolved";
type Language = "Gujarati" | "Hindi" | "English";
type Category = "Safety" | "Cleanliness" | "Fare" | "Lifts & Escalators" | "Staff Behaviour" | "Other";
type ActivityEntry = { time: string; label: string };

type Complaint = {
  id: string;
  text: string;
  language: string;
  category: Category;
  source: string;
  station: string;
  department: Department;
  urgency: Urgency;
  score: number;
  status: Status;
  time: string;
  explanation: string;
  action: string;
  draftReply: string;
  approvedResponse?: string;
  responseApproved?: boolean;
  classificationApproved?: boolean;
  attachment?: string;
  passengerOwned?: boolean;
  demo?: boolean;
  pendingSync?: boolean;
  submittedAt?: string;
  updatedAt?: string;
  activity?: ActivityEntry[];
};

const departments: Department[] = ["Operations", "Housekeeping", "Finance", "Customer Service", "Security"];
const categories: Category[] = ["Safety", "Cleanliness", "Fare", "Lifts & Escalators", "Staff Behaviour", "Other"];
const stations = ["Kalupur", "Old High Court", "Vastral Gam", "Apparel Park", "Thaltej", "Shahpur", "Gheekanta", "Vastral"];
const urgencyOrder: Record<Urgency, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const storageKey = "metrosahayak-v2-complaints";
const demoTime = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
const demoOperatorCredentials = { email: "controller@metrosahayak.demo", password: "MetroPS07!" };
const readAppPath = () => window.location.protocol === "file:" ? window.location.hash.slice(1) || "/passenger" : window.location.pathname;
const replaceAppPath = (path: string) => window.location.protocol === "file:" ? window.history.replaceState({}, "", `#${path}`) : window.history.replaceState({}, "", path);
const pushAppPath = (path: string) => window.location.protocol === "file:" ? window.history.pushState({}, "", `#${path}`) : window.history.pushState({}, "", path);

const demoComplaints: Complaint[] = [
  {
    id: "MS-2048", text: "પ્લેટફોર્મ 2 પર એસ્કેલેટર સવારથી બંધ છે. વૃદ્ધ લોકોને ખૂબ તકલીફ પડે છે.", language: "Gujarati",
    category: "Lifts & Escalators", source: "Passenger portal", station: "Kalupur", department: "Operations", urgency: "High", score: 86,
    status: "Needs review", time: "2 min ago", explanation: "Escalator outage and impact on elderly passengers trigger accessibility and service-disruption rules.",
    action: "Confirm the outage, arrange passenger assistance, and raise a maintenance ticket.", submittedAt: demoTime(2),
    draftReply: "તમારી ફરિયાદ બદલ આભાર. અમે એસ્કેલેટરની સમસ્યા સ્ટેશન ટીમને તપાસ માટે મોકલી છે.", demo: true,
  },
  {
    id: "MS-2047", text: "प्लेटफॉर्म पर बहुत गंदगी है और कूड़ेदान भी भरे हुए हैं। कृपया सफाई करवाएं।", language: "Hindi",
    category: "Cleanliness", source: "Helpline", station: "Old High Court", department: "Housekeeping", urgency: "Medium", score: 54,
    status: "New", time: "8 min ago", explanation: "Cleanliness and overflowing-bin terms route this to housekeeping; no immediate safety risk is described.",
    action: "Notify the housekeeping supervisor and request a platform inspection.", submittedAt: demoTime(8),
    draftReply: "आपकी शिकायत के लिए धन्यवाद। सफाई टीम को प्लेटफॉर्म की जांच के लिए सूचित किया गया है।", demo: true,
  },
  {
    id: "MS-2046", text: "My card was charged twice for one journey from Vastral Gam to Apparel Park.", language: "English",
    category: "Fare", source: "Web form", station: "Vastral Gam", department: "Finance", urgency: "Medium", score: 48,
    status: "Assigned", time: "14 min ago", explanation: "Fare and duplicate-charge terms indicate a payment dispute requiring reconciliation.",
    action: "Collect the journey time and last four card digits, then route to fare reconciliation.", submittedAt: demoTime(27),
    draftReply: "We’re sorry about the duplicate deduction. Please share the journey time and last four digits of your card.", demo: true,
  },
  {
    id: "MS-2045", text: "Counter par staff proper jawab nathi aapta ane passenger sathe rude behave kare chhe.", language: "Gujlish",
    category: "Staff Behaviour", source: "Mobile app", station: "Thaltej", department: "Customer Service", urgency: "Low", score: 31,
    status: "New", time: "22 min ago", explanation: "Mixed Gujarati-English text describes staff conduct without an immediate threat.",
    action: "Record counter and shift details, then share with the station manager.", submittedAt: demoTime(31),
    draftReply: "Tamara feedback mate aabhar. Counter number ane time share karo jethi ame tapash kari shakiye.", demo: true,
  },
  {
    id: "MS-2044", text: "There is smoke near the electrical room at platform 1. I can smell burning.", language: "English",
    category: "Safety", source: "Emergency intercom", station: "Shahpur", department: "Security", urgency: "Critical", score: 97,
    status: "Needs review", time: "25 min ago", explanation: "Smoke, burning smell, and an electrical-room location match multiple emergency rules. Human verification is mandatory.",
    action: "Call station control immediately, isolate the area, and follow fire-response protocol.", submittedAt: demoTime(49),
    draftReply: "Station control is being notified. Please move away from the area and follow staff instructions.", demo: true,
  },
  {
    id: "MS-2043", text: "વિરાટનગર સ્ટેશનની લિફ્ટ કામ કરતી નથી. હું વ્હીલચેર વાપરું છું.", language: "Gujarati",
    category: "Lifts & Escalators", source: "WhatsApp", station: "Vastral", department: "Operations", urgency: "High", score: 91,
    status: "Assigned", time: "31 min ago", explanation: "A lift outage is preventing a wheelchair user from reaching the platform.",
    action: "Arrange immediate assistance and provide an accessible alternate route.", submittedAt: demoTime(55),
    draftReply: "તમને થયેલી અસુવિધા બદલ દિલગીર છીએ. સ્ટેશન ટીમને તાત્કાલિક સહાય માટે જાણ કરી છે.",
    approvedResponse: "તમને થયેલી અસુવિધા બદલ દિલગીર છીએ. સ્ટેશન ટીમને સહાય માટે જાણ કરી છે.", responseApproved: true, passengerOwned: true, demo: true,
  },
  {
    id: "MS-2042", text: "I left a blue backpack in the last coach around 6:10 PM. It has books and house keys.", language: "English",
    category: "Other", source: "Help desk", station: "Gheekanta", department: "Customer Service", urgency: "Medium", score: 43,
    status: "In progress", time: "45 min ago", explanation: "Lost-item terms route this to customer service. House keys increase sensitivity.",
    action: "Log the journey direction and contact details; check with lost-property teams.", submittedAt: demoTime(76),
    draftReply: "We’ve logged your lost-item report. Please share your direction of travel and a contact number.", demo: true,
  },
  {
    id: "MS-2041", text: "अभी भी प्लेटफॉर्म 2 पर कचरा पड़ा है। मैंने सुबह भी यही शिकायत की थी।", language: "Hindi",
    category: "Cleanliness", source: "Mobile app", station: "Old High Court", department: "Housekeeping", urgency: "Medium", score: 59,
    status: "Resolved", time: "52 min ago", explanation: "This repeats a cleanliness issue at the same station and is likely a duplicate.",
    action: "Link to the earlier report and verify completion before closure.", submittedAt: demoTime(103),
    draftReply: "हमने इसे आपकी पिछली शिकायत से जोड़ा है और सफाई की पुष्टि कर ली है।",
    approvedResponse: "सफाई टीम ने प्लेटफॉर्म की सफाई पूरी कर दी है। सूचित करने के लिए धन्यवाद।", responseApproved: true, passengerOwned: true, demo: true,
  },
];

function classify(category: Category, text: string) {
  const lower = text.toLowerCase();
  const emergency = /(smoke|fire|burning|બચાવો|આગ|धुआं|आग|help|weapon|spark)/i.test(text);
  const accessibility = /(wheelchair|વ્હીલચેર|disabled|दिव्यांग|lift|લિફ્ટ)/i.test(text);
  const map: Record<Category, Department> = {
    Safety: "Security", Cleanliness: "Housekeeping", Fare: "Finance",
    "Lifts & Escalators": "Operations", "Staff Behaviour": "Customer Service", Other: "Customer Service",
  };
  const urgency: Urgency = emergency ? "Critical" : accessibility ? "High" : category === "Safety" ? "High" : category === "Cleanliness" || category === "Fare" ? "Medium" : "Low";
  const score = emergency ? 96 : accessibility ? 88 : category === "Other" ? 55 : 78;
  return {
    department: map[category], urgency, score,
    explanation: emergency
      ? "Emergency keywords match local safety rules. This must be verified immediately by a human controller."
      : `The selected ${category.toLowerCase()} category and complaint wording match local routing rules for ${map[category]}.`,
    action: emergency ? "Contact station control immediately and follow the verified emergency protocol." : `Review the details and assign this report to ${map[category]}.`,
    lower,
  };
}

function preparedReply(language: string) {
  if (language === "Gujarati") return "તમારી ફરિયાદ બદલ આભાર. અમારી ટીમે તેની તપાસ શરૂ કરી છે. વધુ માહિતી મળતાં અમે અહીં અપડેટ આપીશું.";
  if (language === "Hindi") return "आपकी शिकायत के लिए धन्यवाद। हमारी टीम ने इसकी जांच शुरू कर दी है। अधिक जानकारी मिलने पर हम यहां अपडेट देंगे।";
  return "Thank you for reporting this. Our team has started reviewing it and will share an update here when more information is available.";
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    inbox: <><path d="M4 4h16v12H15l-2 3h-2l-2-3H4z" /><path d="M4 12h5l2 3h2l2-3h5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    wifi: <><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="20" r=".7" /></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5" /><path d="M12 17.5v.1" /></>,
    check: <path d="m5 12 4 4L19 6" />, spark: <><path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9L12 3Z" /><path d="m19 15 .6 2.1L22 18l-2.4.9L19 21l-.6-2.1L16 18l2.4-.9L19 15Z" /></>,
    chevron: <path d="m9 18 6-6-6-6" />, clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>, user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    train: <><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M8 21l2-3M16 18l2 3M8 8h8M9 13h.1M15 13h.1" /></>,
    back: <><path d="m15 18-6-6 6-6" /></>, camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3" /></>,
    chart: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Button({ children, variant = "secondary", onClick, disabled = false, type = "button" }: { children: React.ReactNode; variant?: string; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
  return <button type={type} className={`button button-${variant}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function urgencyTone(urgency: Urgency) {
  return urgency === "Critical" ? "critical" : urgency === "High" ? "high" : urgency === "Medium" ? "medium" : "low";
}

function statusTone(status: Status) {
  return status === "Resolved" ? "success" : status === "Needs review" ? "warning" : status === "Assigned" || status === "In progress" ? "info" : "neutral";
}

export default function App() {
  const [items, setItems] = useState<Complaint[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : demoComplaints;
    } catch { return demoComplaints; }
  });
  const [portal, setPortal] = useState<"passenger" | "operator">(() => readAppPath().startsWith("/operator") ? "operator" : "passenger");
  const [currentPath, setCurrentPath] = useState(readAppPath);
  const [operatorAuthorized, setOperatorAuthorized] = useState(false);
  const [operatorLogin, setOperatorLogin] = useState({ email: "", password: "" });
  const [operatorLoginError, setOperatorLoginError] = useState("");
  const [operatorLoginLoading, setOperatorLoginLoading] = useState(false);
  const [passengerPage, setPassengerPage] = useState<"welcome" | "new" | "mine" | "detail" | "confirmed">("welcome");
  const [language, setLanguage] = useState<Language>("English");
  const [selectedId, setSelectedId] = useState(items.find((item) => item.urgency === "Critical")?.id ?? items[0].id);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All departments");
  const [issueFilter, setIssueFilter] = useState("All categories");
  const [urgencyFilter, setUrgencyFilter] = useState("All urgency");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sort, setSort] = useState("Urgency: high to low");
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ category: "" as Category | "", station: "", description: "", attachment: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeNav, setActiveNav] = useState("inbox");
  const [confirmReply, setConfirmReply] = useState(false);
  const [passengerQuery, setPassengerQuery] = useState("");
  const submissionLock = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* Storage may be unavailable. */ }
  }, [items]);

  useEffect(() => {
    if (readAppPath() === "/") {
      replaceAppPath("/passenger");
      setCurrentPath("/passenger");
    }
    function followBrowserNavigation() {
      const nextPath = readAppPath();
      setCurrentPath(nextPath);
      setPortal(nextPath.startsWith("/operator") ? "operator" : "passenger");
    }
    window.addEventListener("popstate", followBrowserNavigation);
    window.addEventListener("hashchange", followBrowserNavigation);
    return () => {
      window.removeEventListener("popstate", followBrowserNavigation);
      window.removeEventListener("hashchange", followBrowserNavigation);
    };
  }, []);

  useEffect(() => {
    if (currentPath.startsWith("/operator") && currentPath !== "/operator/login" && currentPath !== "/operator/dashboard") {
      replaceAppPath("/operator/login");
      setCurrentPath("/operator/login");
      setOperatorLoginError("The requested operator page requires staff authentication.");
    } else if (currentPath === "/operator/dashboard" && !operatorAuthorized) {
      replaceAppPath("/operator/login");
      setCurrentPath("/operator/login");
      setOperatorLoginError("Operator authentication is required to access the dashboard.");
    } else if (currentPath === "/operator/login" && operatorAuthorized) {
      replaceAppPath("/operator/dashboard");
      setCurrentPath("/operator/dashboard");
    }
  }, [currentPath, operatorAuthorized]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const incoming = JSON.parse(event.newValue);
        if (Array.isArray(incoming)) setItems(incoming);
      } catch { /* Ignore malformed external storage values. */ }
    }
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const hasUnapprovedDraft = selected.draftReply.trim() !== (selected.approvedResponse ?? "").trim();
  const passengerItems = items.filter((item) => item.passengerOwned);
  const visiblePassengerItems = passengerItems.filter((item) => [item.id, item.category, item.station, item.text].join(" ").toLowerCase().includes(passengerQuery.toLowerCase()));
  const trendData = useMemo(() => Array.from({ length: 5 }, (_, index) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (4 - index));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return {
      label: dayStart.toLocaleDateString("en", { weekday: "short" }),
      count: items.filter((item) => {
        if (!item.submittedAt) return false;
        const date = new Date(item.submittedAt);
        return date >= dayStart && date < dayEnd;
      }).length,
    };
  }), [items]);
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return items
      .filter((item) => (categoryFilter === "All departments" || item.department === categoryFilter)
        && (issueFilter === "All categories" || item.category === issueFilter)
        && (urgencyFilter === "All urgency" || item.urgency === urgencyFilter)
        && (statusFilter === "All statuses" || item.status === statusFilter)
        && [item.id, item.text, item.station, item.language].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => sort.startsWith("Urgency") ? urgencyOrder[b.urgency] - urgencyOrder[a.urgency] : b.id.localeCompare(a.id));
  }, [items, query, categoryFilter, issueFilter, urgencyFilter, statusFilter, sort]);

  function saveUpdate(id: string, changes: Partial<Complaint>, message?: string, trackSync = true) {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => item.id === id ? {
      ...item,
      ...changes,
      updatedAt: now,
      activity: message ? [...(item.activity ?? []), { time: now, label: message }] : item.activity,
      ...(!isOnline && trackSync ? { pendingSync: true } : {}),
    } : item));
    if (!isOnline && trackSync) setPendingSync((count) => count + 1);
    if (message) {
      setNotice(message);
      window.setTimeout(() => setNotice(""), 2400);
    }
  }

  function navigateToPath(path: "/passenger" | "/operator/login" | "/operator/dashboard") {
    pushAppPath(path);
    setCurrentPath(path);
    setPortal(path.startsWith("/operator") ? "operator" : "passenger");
  }

  function navigatePortal(nextPortal: "passenger" | "operator") {
    navigateToPath(nextPortal === "operator" ? operatorAuthorized ? "/operator/dashboard" : "/operator/login" : "/passenger");
  }

  function operatorUpdate(id: string, changes: Partial<Complaint>, message?: string, trackSync = true) {
    if (!operatorAuthorized || portal !== "operator" || currentPath !== "/operator/dashboard") {
      setNotice("Access denied. An active operator session is required.");
      return false;
    }
    saveUpdate(id, changes, message, trackSync);
    return true;
  }

  function signOutOperator() {
    setOperatorAuthorized(false);
    setOperatorLogin({ email: "", password: "" });
    navigatePortal("passenger");
    setPassengerPage("welcome");
    setNotice("Operator session ended");
  }

  function submitOperatorLogin(event: React.FormEvent) {
    event.preventDefault();
    if (operatorLoginLoading) return;
    setOperatorLoginError("");
    setOperatorLoginLoading(true);
    window.setTimeout(() => {
      const valid = operatorLogin.email.trim().toLowerCase() === demoOperatorCredentials.email
        && operatorLogin.password === demoOperatorCredentials.password;
      setOperatorLoginLoading(false);
      if (!valid) {
        setOperatorAuthorized(false);
        setOperatorLoginError("Access denied. Check the operator ID and access code.");
        return;
      }
      setOperatorAuthorized(true);
      navigateToPath("/operator/dashboard");
      setNotice("Prototype operator session started");
    }, 350);
  }

  function toggleConnection() {
    if (!isOnline) {
      setIsOnline(true);
      setPendingSync(0);
      setItems((current) => current.map((item) => item.pendingSync ? { ...item, pendingSync: false } : item));
      setNotice("Changes marked synced in this local demo. No server was contacted.");
    } else {
      setIsOnline(false);
      setNotice("Offline simulation enabled. Changes stay in this browser.");
    }
  }

  function submitComplaint(event: React.FormEvent) {
    event.preventDefault();
    if (submissionLock.current) return;
    const nextErrors: Record<string, string> = {};
    if (!form.category) nextErrors.category = "Choose a complaint category.";
    if (!form.station) nextErrors.station = "Choose a station.";
    if (form.description.trim().length < 10) nextErrors.description = "Please add at least 10 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const duplicate = items.some((item) => item.passengerOwned
      && item.station === form.station
      && item.category === form.category
      && item.text.trim().toLowerCase() === form.description.trim().toLowerCase()
      && item.submittedAt
      && Date.now() - new Date(item.submittedAt).getTime() < 30_000);
    if (duplicate) {
      setErrors({ description: "This complaint was already submitted. Track the existing complaint instead." });
      return;
    }
    submissionLock.current = true;
    setIsSubmitting(true);
    window.setTimeout(() => {
      const result = classify(form.category as Category, form.description);
      const max = Math.max(...items.map((item) => Number(item.id.replace(/\D/g, ""))));
      const id = `MS-${max + 1}`;
      const submittedAt = new Date().toISOString();
      const complaint: Complaint = {
        id, text: form.description.trim(), language, category: form.category as Category, station: form.station,
        source: "Passenger portal", status: result.urgency === "Critical" ? "Needs review" : "New",
        department: result.department, urgency: result.urgency, score: result.score, explanation: result.explanation,
        action: result.action, draftReply: preparedReply(language), attachment: form.attachment || undefined,
        time: "Just now", passengerOwned: true, pendingSync: !isOnline, submittedAt, updatedAt: submittedAt,
        activity: [{ time: submittedAt, label: "Complaint submitted from Passenger Portal" }],
      };
      setItems((current) => [complaint, ...current]);
      setSelectedId(id);
      if (!isOnline) setPendingSync((count) => count + 1);
      setForm({ category: "", station: "", description: "", attachment: "" });
      setIsSubmitting(false);
      submissionLock.current = false;
      setPassengerPage("confirmed");
    }, 450);
  }

  function openPassengerDetail(id: string) {
    setSelectedId(id);
    setPassengerPage("detail");
  }

  function reclassifyCategory(category: Category) {
    const suggestion = classify(category, selected.text);
    operatorUpdate(selected.id, {
      category,
      department: suggestion.department,
      urgency: suggestion.urgency,
      score: suggestion.score,
      explanation: suggestion.explanation,
      action: suggestion.action,
      classificationApproved: false,
    }, `Local rules updated the suggested route for ${category}`);
  }

  function goToOperatorSection(section: string, filter?: "priority") {
    setActiveNav(section);
    if (filter === "priority") {
      setUrgencyFilter("Critical");
      setStatusFilter("All statuses");
    }
    document.getElementById(section === "overview" || section === "reports" ? "operator-overview" : "operator-inbox")?.scrollIntoView({ behavior: "smooth" });
  }

  function approveCurrentReply() {
    if (operatorUpdate(selected.id, { approvedResponse: selected.draftReply, responseApproved: true }, "Reply approved and now visible in Passenger Portal")) {
      setConfirmReply(false);
    }
  }

  if (portal === "passenger") {
    return (
      <div className="passenger-app">
        <header className="passenger-header">
          <button className="passenger-brand" onClick={() => setPassengerPage("welcome")}><span className="passenger-logo"><Icon name="train" /></span><span><strong>MetroSahayak</strong><small>Every complaint heard</small></span></button>
          <div className="passenger-head-actions">
            <button className={`connection-chip ${isOnline ? "" : "offline"}`} onClick={toggleConnection}><span></span>{isOnline ? "Online" : `${pendingSync} pending`}</button>
            {passengerPage === "welcome" && <button className="operator-login-link" onClick={() => navigateToPath("/operator/login")}><Icon name="lock" size={15} />Operator Login</button>}
          </div>
        </header>

        {passengerPage === "welcome" && (
          <main className="passenger-main welcome-page">
            <div className="demo-banner"><span>DEMO PROTOTYPE</span> Reports remain in this browser and are not sent to a metro authority.</div>
            <section className="welcome-hero">
              <div className="welcome-art"><div className="route-line"></div><span><Icon name="train" size={38} /></span></div>
              <p className="welcome-kicker">METROSAHAYAK AI · PASSENGER CARE</p>
              <h1>{language === "Gujarati" ? "તમારો અવાજ. વધુ સારી મેટ્રો." : language === "Hindi" ? "आपकी आवाज़। बेहतर मेट्रो।" : "Your Voice. A Better Metro."}</h1>
              <p>Report station and journey issues in under a minute, then follow every update in one place.</p>
              <div className="language-picker">
                <span>Choose your language</span>
                <div>{(["Gujarati", "Hindi", "English"] as Language[]).map((item) => <button key={item} className={language === item ? "selected" : ""} onClick={() => setLanguage(item)}>{item === "Gujarati" ? "ગુજરાતી" : item === "Hindi" ? "हिन्दी" : "English"}</button>)}</div>
              </div>
              <button className="passenger-primary" onClick={() => setPassengerPage("new")}><Icon name="plus" />Report an Issue</button>
              <button className="passenger-secondary" onClick={() => setPassengerPage("mine")}><Icon name="search" />Track Complaint <span>{passengerItems.length}</span></button>
              <div className="quick-issues">
                {(["Safety", "Cleanliness", "Lifts & Escalators", "Fare", "Staff Behaviour"] as Category[]).map((item) => (
                  <button key={item} onClick={() => { setForm((current) => ({ ...current, category: item })); setPassengerPage("new"); }}>
                    <span><Icon name={item === "Safety" ? "alert" : item === "Fare" ? "grid" : item === "Staff Behaviour" ? "user" : item === "Lifts & Escalators" ? "train" : "spark"} /></span>{item}
                  </button>
                ))}
              </div>
              <p className="privacy-note">No account needed for this local demo.</p>
            </section>
          </main>
        )}

        {passengerPage === "new" && (
          <main className="passenger-main">
            <button className="back-link" onClick={() => setPassengerPage("welcome")}><Icon name="back" />Back</button>
            <div className="form-progress"><span className="active"></span><span></span><span></span><small>COMPLAINT DETAILS · STEP 1 OF 3</small></div>
            <div className="passenger-title"><span>1</span><div><h1>Tell us what happened</h1><p>Clear details help the right team respond faster.</p></div></div>
            <form className="complaint-form" onSubmit={submitComplaint}>
              <label><span>Response language</span><div className="form-language">{(["English", "Gujarati", "Hindi"] as Language[]).map((item) => <button type="button" key={item} className={language === item ? "selected" : ""} onClick={() => setLanguage(item)}>{item === "Gujarati" ? "ગુજરાતી" : item === "Hindi" ? "हिन्दी" : "English"}</button>)}</div></label>
              <fieldset><legend>What is this about?</legend><div className="category-grid">{categories.map((item) => <button type="button" key={item} className={form.category === item ? "selected" : ""} onClick={() => setForm({ ...form, category: item })}>{item}</button>)}</div>{errors.category && <p className="field-error">{errors.category}</p>}</fieldset>
              <label><span>Station</span><select value={form.station} onChange={(event) => setForm({ ...form, station: event.target.value })}><option value="">Select a station</option>{stations.map((station) => <option key={station}>{station}</option>)}</select>{errors.station && <small className="field-error">{errors.station}</small>}</label>
              <label><span>Describe the issue</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={language === "Gujarati" ? "શું થયું તે અહીં લખો..." : language === "Hindi" ? "यहां बताएं कि क्या हुआ..." : "Tell us what happened..."} rows={5} /><small className={errors.description ? "field-error counter" : "counter"}>{errors.description || `${form.description.length} characters`}</small></label>
              <label className="photo-input"><span>Photo <small>Optional</small></span><input type="file" accept="image/*" onChange={(event) => setForm({ ...form, attachment: event.target.files?.[0]?.name ?? "" })} /><span className="photo-box"><Icon name="camera" />{form.attachment || "Add a photo"}</span></label>
              <div className="offline-form-note"><Icon name={isOnline ? "check" : "wifi"} />{isOnline ? "Saved securely in this browser demo" : "You’re offline. This will be marked Pending sync."}</div>
              <button className="passenger-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? <><span className="button-spinner"></span>Saving complaint…</> : <>Submit complaint <Icon name="chevron" /></>}</button>
            </form>
          </main>
        )}

        {passengerPage === "confirmed" && (
          <main className="passenger-main confirmation-page">
            <div className="confirm-icon"><Icon name="check" size={32} /></div>
            <p className="welcome-kicker">COMPLAINT SAVED</p><h1>Thank you for speaking up</h1>
            <p>Your reference number is</p><strong className="reference-id">{selected.id}</strong>
            <Badge tone={selected.pendingSync ? "warning" : "info"}>{selected.pendingSync ? "Pending sync · local only" : "Saved in local demo"}</Badge>
            <div className="confirmation-note">Keep this reference number to track updates. This prototype does not send reports to real authorities.</div>
            <button className="passenger-primary" onClick={() => openPassengerDetail(selected.id)}>Track this complaint</button>
            <button className="passenger-secondary" onClick={() => setPassengerPage("welcome")}>Return to passenger home</button>
          </main>
        )}

        {passengerPage === "mine" && (
          <main className="passenger-main">
            <button className="back-link" onClick={() => setPassengerPage("welcome")}><Icon name="back" />Home</button>
            <div className="passenger-title"><span><Icon name="inbox" /></span><div><h1>My complaints</h1><p>Updates stored in this browser</p></div></div>
            {!isOnline && <div className="pending-banner"><Icon name="wifi" />Offline · {pendingSync} local change{pendingSync === 1 ? "" : "s"} pending</div>}
            <label className="passenger-search"><Icon name="search" /><input aria-label="Search my complaints" value={passengerQuery} onChange={(event) => setPassengerQuery(event.target.value)} placeholder="Search complaint ID, station or issue" /></label>
            <div className="my-list">{visiblePassengerItems.map((item) => <button key={item.id} className="my-card" onClick={() => openPassengerDetail(item.id)}><div><strong>{item.category}</strong><span className="card-badges"><Badge tone={statusTone(item.status)}>{item.status}</Badge>{item.pendingSync && <Badge tone="warning">Pending sync</Badge>}</span></div><p>{item.text}</p><span>{item.id} · {item.station}<Icon name="chevron" size={15} /></span></button>)}</div>
            {visiblePassengerItems.length === 0 && <div className="passenger-empty"><Icon name="search" /><strong>No complaint found</strong><p>Check the reference ID or try a station name.</p><button onClick={() => setPassengerQuery("")}>Clear search</button></div>}
          </main>
        )}

        {passengerPage === "detail" && (
          <main className="passenger-main">
            <button className="back-link" onClick={() => setPassengerPage("mine")}><Icon name="back" />My complaints</button>
            <div className="tracking-head"><div><p>REFERENCE</p><h1>{selected.id}</h1></div><Badge tone={statusTone(selected.status)}>{selected.status}</Badge></div>
            {selected.pendingSync && <div className="pending-banner"><Icon name="wifi" />Waiting to sync · Saved only in this browser. No server request has been made.</div>}
            <div className="tracking-card"><span>YOUR COMPLAINT</span><strong>{selected.category} · {selected.station}</strong><div className="tracking-meta"><Badge tone={urgencyTone(selected.urgency)}>{selected.urgency} urgency</Badge><span>{selected.language}</span></div><p>{selected.text}</p>{selected.attachment && <small><Icon name="camera" size={14} />{selected.attachment}</small>}</div>
            <div className="status-timeline"><div className="done"><i><Icon name="check" /></i><span><strong>Submitted</strong><small>Complaint saved with reference ID</small></span></div><div className={selected.status !== "New" && selected.status !== "Needs review" ? "done" : ""}><i>{selected.status !== "New" && selected.status !== "Needs review" ? <Icon name="check" /> : "2"}</i><span><strong>Under Review</strong><small>Classification and human verification</small></span></div><div className={selected.status === "In progress" || selected.status === "Resolved" ? "done" : ""}><i>{selected.status === "In progress" || selected.status === "Resolved" ? <Icon name="check" /> : "3"}</i><span><strong>In Progress</strong><small>Assigned department is working on it</small></span></div><div className={selected.status === "Resolved" ? "done" : ""}><i>{selected.status === "Resolved" ? <Icon name="check" /> : "4"}</i><span><strong>Resolved</strong><small>Final update available</small></span></div></div>
            {selected.responseApproved && selected.approvedResponse ? <div className="approved-response"><div><Icon name="check" /><strong>Response from MetroSahayak operator</strong></div><p>{selected.approvedResponse}</p><small>Approved response · Demo data</small></div> : <div className="waiting-response"><Icon name="clock" /><div><strong>No approved response yet</strong><p>A draft remains private until an operator approves it.</p></div></div>}
          </main>
        )}
        {notice && <div className="interaction-toast" role="status">{notice}</div>}
      </div>
    );
  }

  if (!operatorAuthorized || currentPath !== "/operator/dashboard") {
    return (
      <div className="operator-access-page">
        <div className="access-brand"><span><Icon name="train" size={24} /></span><div><strong>MetroSahayak AI</strong><small>STAFF OPERATIONS ACCESS</small></div></div>
        <main className="access-card">
          <span className="access-lock"><Icon name="user" size={24} /></span>
          <p className="access-eyebrow">RESTRICTED PORTAL</p>
          <h1>Operator sign in</h1>
          <p className="access-intro">This area contains internal complaint details and operational controls. Passenger access is not permitted.</p>
          <form onSubmit={submitOperatorLogin}>
            <label><span>Operator email</span><input type="email" autoComplete="username" value={operatorLogin.email} onChange={(event) => setOperatorLogin({ ...operatorLogin, email: event.target.value })} placeholder="name@metro-operations.example" required /></label>
            <label><span>Password</span><input type="password" autoComplete="current-password" value={operatorLogin.password} onChange={(event) => setOperatorLogin({ ...operatorLogin, password: event.target.value })} placeholder="Enter password" required /></label>
            {operatorLoginError && <div className="access-error" role="alert"><Icon name="alert" />{operatorLoginError}</div>}
            <button className="passenger-primary" type="submit" disabled={operatorLoginLoading}>{operatorLoginLoading ? <><span className="button-spinner"></span>Verifying access…</> : "Sign in to Operations"}</button>
          </form>
          <div className="prototype-security"><Icon name="alert" /><div><strong>Prototype security notice</strong><p>No authentication backend is configured. This client-side, non-persistent demo gate is not production-grade authorization and must be replaced by server-verified identity and role checks before deployment.</p></div></div>
          <button className="return-passenger" onClick={() => navigatePortal("passenger")}><Icon name="back" />Return to Passenger Portal</button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span></span><span></span><span></span></div><div><strong>MetroSahayak</strong><small>AI CONTROL DESK</small></div></div>
        <nav>
          <p className="nav-label">OPERATIONS</p>
          <button className={`nav-item ${activeNav === "overview" ? "active" : ""}`} onClick={() => goToOperatorSection("overview")}><Icon name="grid" />Overview</button>
          <button className={`nav-item ${activeNav === "inbox" ? "active" : ""}`} onClick={() => goToOperatorSection("inbox")}><Icon name="inbox" />Complaint Inbox<b>{items.filter((item) => item.status === "New" || item.status === "Needs review").length}</b></button>
          <button className={`nav-item ${activeNav === "priority" ? "active" : ""}`} onClick={() => goToOperatorSection("priority", "priority")}><Icon name="alert" />Priority Cases</button>
          <button className={`nav-item ${activeNav === "departments" ? "active" : ""}`} onClick={() => { setActiveNav("departments"); setCategoryFilter("All departments"); document.getElementById("operator-inbox")?.scrollIntoView({ behavior: "smooth" }); }}><Icon name="train" />Departments</button>
          <button className={`nav-item ${activeNav === "reports" ? "active" : ""}`} onClick={() => goToOperatorSection("reports")}><Icon name="chart" />Reports</button>
          <div className="nav-divider"></div>
          <p className="nav-label">SYSTEM</p>
          <button className={`nav-item ${activeNav === "settings" ? "active" : ""}`} onClick={() => { setActiveNav("settings"); setNotice("Demo settings use local browser storage. No backend is configured."); }}><Icon name="grid" />Settings</button>
        </nav>
        <div className="sidebar-status"><div className="status-line"><span className={`status-dot ${isOnline ? "online" : "offline"}`}></span><strong>{isOnline ? "Online demo" : "Offline mode"}</strong></div><p>{pendingSync ? `${pendingSync} local changes pending` : "Shared browser storage only"}</p><button onClick={toggleConnection}>{isOnline ? "Simulate offline" : "Restore connection"}</button></div>
        <button className="passenger-switch" onClick={signOutOperator}><Icon name="user" />Sign out to Passenger<Icon name="chevron" size={15} /></button>
        <div className="operator"><div className="avatar">AP</div><div><strong>Arjun Patel</strong><span>Station Controller</span></div></div>
      </aside>

      <main className="main">
        <header className="topbar"><div><h1>Complaint Operations</h1><p>Review, route and resolve every passenger report.</p></div><label className="top-search"><Icon name="search" /><input aria-label="Search all complaints" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, station or description" /></label><div className="top-actions"><Badge tone={isOnline ? "success" : "warning"}><Icon name="wifi" size={14} />{isOnline ? "Local workspace" : `${pendingSync} pending`}</Badge><button className="notification-button" aria-label="Notifications" onClick={() => setNotice("No new operator notifications")}><Icon name="bell" /></button><button className="top-profile" onClick={() => setNotice("Signed in as Arjun Patel · Station Controller")}><span>AP</span><b>Arjun</b></button><button className="operator-mobile-passenger" onClick={signOutOperator}><Icon name="user" />Sign out</button><span className="demo-pill">DEMO DATA</span></div></header>
        <div className="content">
          <section className="metrics" id="operator-overview">
            <div className="metric-card"><span className="metric-icon metric-teal"><Icon name="inbox" /></span><div><p>TOTAL RECEIVED</p><strong>{items.length}</strong><small>local complaints</small></div></div>
            <div className="metric-card"><span className="metric-icon metric-red"><Icon name="alert" /></span><div><p>URGENT REVIEW</p><strong>{items.filter((item) => item.urgency === "Critical" || item.urgency === "High").length}</strong><small>needs attention</small></div></div>
            <div className="metric-card"><span className="metric-icon metric-amber"><Icon name="clock" /></span><div><p>PENDING</p><strong>{items.filter((item) => item.status !== "Resolved").length}</strong><small>open complaints</small></div></div>
            <div className="metric-card"><span className="metric-icon metric-teal"><Icon name="spark" /></span><div><p>IN PROGRESS</p><strong>{items.filter((item) => item.status === "In progress").length}</strong><small>actively handled</small></div></div>
            <div className="metric-card"><span className="metric-icon metric-blue"><Icon name="check" /></span><div><p>RESOLVED</p><strong>{items.filter((item) => item.status === "Resolved").length}</strong><small>closed complaints</small></div></div>
          </section>

          <div className="demo-disclosure"><Icon name="wifi" /><span><strong>Local shared demo:</strong> Both portals share this browser’s storage. Separate devices will not synchronize without a backend.</span><button onClick={signOutOperator}>Sign out to passenger</button></div>
          <section className="insight-card">
            <div><p className="insight-eyebrow">LIVE LOCAL DATASET</p><h2>Complaints by category</h2><span>Distribution across {items.length} fictional and submitted reports</span></div>
            <div className="category-distribution">{categories.map((category) => { const count = items.filter((item) => item.category === category).length; return <div key={category}><span>{category}</span><div><i className={`distribution-count-${Math.min(count, 4)}`}></i></div><b>{count}</b></div>; })}</div>
          </section>
          <section className="operator-overview-grid">
            <div className="trend-card">
              <div className="card-heading"><div><p>COMPLAINT TREND</p><h2>Five-day submissions</h2></div><Badge>Actual local records</Badge></div>
              <div className="trend-chart">{trendData.map((day) => { const max = Math.max(1, ...trendData.map((item) => item.count)); const level = Math.max(1, Math.round((day.count / max) * 4)); return <div key={day.label}><span>{day.count}</span><i><b className={`trend-level-${level}`}></b></i><small>{day.label}</small></div>; })}</div>
            </div>
            <div className="priority-card">
              <div className="card-heading"><div><p>HUMAN REVIEW</p><h2>Priority & safety cases</h2></div><button onClick={() => goToOperatorSection("priority", "priority")}>View all</button></div>
              <div className="priority-list">{items.filter((item) => item.urgency === "Critical" || (item.category === "Safety" && item.status !== "Resolved")).slice(0, 3).map((item) => <button key={item.id} onClick={() => { setSelectedId(item.id); document.getElementById("operator-inbox")?.scrollIntoView({ behavior: "smooth" }); }}><span className="priority-symbol"><Icon name="alert" /></span><span><strong>{item.id} · {item.station}</strong><small>{item.text}</small></span><Badge tone={urgencyTone(item.urgency)}>{item.urgency}</Badge></button>)}</div>
            </div>
          </section>
          <section className="register-card">
            <div className="card-heading"><div><p>RECENT ACTIVITY</p><h2>Complaint register</h2></div><span>{items.length} records in this browser</span></div>
            <div className="register-scroll"><table><thead><tr><th>ID</th><th>Complaint</th><th>Station</th><th>Category</th><th>Urgency</th><th>Department</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.slice(0, 5).map((item) => <tr key={item.id} className={item.urgency === "Critical" ? "critical-row" : ""}><td><strong>{item.id}</strong></td><td><span className="table-complaint">{item.text}</span></td><td>{item.station}</td><td>{item.category}</td><td><Badge tone={urgencyTone(item.urgency)}>{item.urgency}</Badge></td><td>{item.department}</td><td>{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : item.time}</td><td><Badge tone={statusTone(item.status)}>{item.status}</Badge></td><td><button onClick={() => { setSelectedId(item.id); goToOperatorSection("inbox"); }}>Open</button></td></tr>)}</tbody></table></div>
          </section>
          <section className="workspace" id="operator-inbox">
            <div className="inbox-panel">
              <div className="panel-title"><div><h2>Complaint inbox</h2><p>{filtered.length} of {items.length} complaints</p></div></div>
              <div className="filters"><select aria-label="Category filter" value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Urgency filter" value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value)}><option>All urgency</option>{(["Critical", "High", "Medium", "Low"] as Urgency[]).map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Status filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{(["New", "Needs review", "Assigned", "In progress", "Resolved"] as Status[]).map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Department filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Sort complaints" value={sort} onChange={(event) => setSort(event.target.value)}><option>Urgency: high to low</option><option>Newest first</option></select></div>
              <div className="complaint-list">{filtered.map((item) => <button key={item.id} className={`complaint-row ${selected.id === item.id ? "selected" : ""}`} onClick={() => setSelectedId(item.id)}><span className={`urgency-rail ${urgencyTone(item.urgency)}`}></span><span className="complaint-body"><span className="complaint-meta"><b>{item.id}</b><span>{item.time}</span></span><strong>{item.station}<span>·</span>{item.category}</strong><span className="complaint-preview">{item.text}</span><span className="complaint-tags"><Badge tone={urgencyTone(item.urgency)}>{item.urgency}</Badge><Badge>{item.department}</Badge><Badge tone={statusTone(item.status)}>{item.status}</Badge>{item.demo && <Badge>Demo</Badge>}</span></span></button>)}</div>
              {filtered.length === 0 && <div className="empty-state"><Icon name="search" /><strong>No complaints match these filters</strong><span>Clear a filter or try a broader search.</span><button onClick={() => { setQuery(""); setIssueFilter("All categories"); setUrgencyFilter("All urgency"); setStatusFilter("All statuses"); setCategoryFilter("All departments"); }}>Clear filters</button></div>}
            </div>

            <article className="detail-panel">
              <div className="detail-header"><div><div className="title-line"><h2>{selected.id}</h2><Badge tone={urgencyTone(selected.urgency)}>{selected.urgency} · {selected.score}% confidence</Badge></div><p>{selected.station} · {selected.source} · {selected.language}</p></div><Badge tone={statusTone(selected.status)}>{selected.status}</Badge></div>
              {selected.urgency === "Critical" && selected.status !== "Resolved" && <div className="safety-alert"><Icon name="alert" /><div><strong>Immediate human review required</strong><p>Potential emergency. Verify through station control before acting.</p></div></div>}
              <div className="detail-section"><div className="section-label"><span>ORIGINAL COMPLAINT</span><Badge>{selected.category}</Badge></div><blockquote>{selected.text}</blockquote>{selected.attachment && <p className="attachment"><Icon name="camera" size={14} />Attachment: {selected.attachment}</p>}</div>
              <div className="classification-grid"><label><span>Suggested category</span><select value={selected.category} onChange={(event) => reclassifyCategory(event.target.value as Category)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Responsible department</span><select value={selected.department} onChange={(event) => operatorUpdate(selected.id, { department: event.target.value as Department, classificationApproved: false }, `Department assigned to ${event.target.value}`)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Urgency</span><select value={selected.urgency} onChange={(event) => operatorUpdate(selected.id, { urgency: event.target.value as Urgency, classificationApproved: false }, `Urgency changed to ${event.target.value}`)}>{(["Critical", "High", "Medium", "Low"] as Urgency[]).map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Status</span><select value={selected.status} onChange={(event) => operatorUpdate(selected.id, { status: event.target.value as Status }, `Status updated to ${event.target.value}`)}>{(["New", "Needs review", "Assigned", "In progress", "Resolved"] as Status[]).map((item) => <option key={item}>{item}</option>)}</select></label></div>
              <div className="ai-reasoning"><div className="ai-title"><Icon name="spark" /><strong>Local classification suggestion</strong><span>{selected.score}% confidence · Rule-based</span></div><p className="review-label">SUGGESTION ONLY · OPERATOR REVIEW REQUIRED</p><p>{selected.explanation}</p><div className="next-action"><span>RECOMMENDED NEXT ACTION</span><p>{selected.action}</p></div></div>
              <div className="reply-section"><div className="section-label"><span>RESPONSE DRAFT</span><Badge>{selected.language}</Badge></div><textarea aria-label="Response draft" rows={4} value={selected.draftReply} onChange={(event) => operatorUpdate(selected.id, { draftReply: event.target.value }, undefined, false)} onBlur={() => { if (!isOnline && operatorAuthorized) setPendingSync((count) => count + 1); }} /><p className="reply-note">Private draft until approved. Passenger cannot see unapproved text.</p></div>
              <div className="activity-panel"><div className="section-label"><span>ACTIVITY HISTORY</span><Badge>{(selected.activity ?? []).length + 1} events</Badge></div><div className="activity-list">{[...(selected.activity ?? [])].reverse().slice(0, 5).map((entry, index) => <div key={`${entry.time}-${index}`}><i></i><span><strong>{entry.label}</strong><small>{new Date(entry.time).toLocaleString()}</small></span></div>)}<div><i></i><span><strong>Complaint record created</strong><small>{selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : selected.time}</small></span></div></div></div>
              <div className="action-bar"><Button variant="primary" disabled={selected.status === "Resolved"} onClick={() => operatorUpdate(selected.id, { status: "Assigned", classificationApproved: true }, `${selected.id} assigned`)}><Icon name="check" />Assign</Button><Button onClick={() => operatorUpdate(selected.id, { draftReply: selected.draftReply }, "Draft saved in this browser")}><Icon name="clock" />Save Draft</Button><Button disabled={selected.classificationApproved} onClick={() => operatorUpdate(selected.id, { classificationApproved: true }, "Classification approved")}>{selected.classificationApproved ? "Classification approved" : "Review suggestion"}</Button><Button onClick={() => operatorUpdate(selected.id, { status: selected.status }, `Status confirmed as ${selected.status}`)}>Update Status</Button><Button variant="success" disabled={!selected.draftReply.trim() || !hasUnapprovedDraft} onClick={() => setConfirmReply(true)}>{hasUnapprovedDraft ? selected.responseApproved ? "Approve Updated Reply" : "Approve Reply" : "Reply Approved"}</Button></div>
              <p className="disclaimer">Prototype only. Nothing is sent to a real metro authority.</p>
            </article>
          </section>
        </div>
      </main>
      {notice && <div className="interaction-toast" role="status">{notice}</div>}
      {confirmReply && <div className="dialog-backdrop" role="presentation" onMouseDown={() => setConfirmReply(false)}><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="approve-title" onMouseDown={(event) => event.stopPropagation()}><span className="dialog-icon"><Icon name="check" /></span><h2 id="approve-title">Approve this passenger reply?</h2><p>Once approved, this exact message becomes visible in Passenger Portal tracking.</p><blockquote>{selected.draftReply}</blockquote><div><Button onClick={() => setConfirmReply(false)}>Keep editing</Button><Button variant="success" onClick={approveCurrentReply}>Approve Reply</Button></div></div></div>}
    </div>
  );
}
