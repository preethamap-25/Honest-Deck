import {
  MessageSquare,
  Zap,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Pin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/Appcontext";
import Topbar from "../components/Topbar";
import { TAG_COLORS } from "../data/mockData";

export default function DashboardPage() {
  const { user, chats, setActiveChatId } = useApp();
  const navigate = useNavigate();

  const recentChats = chats.slice(0, 4);
  const pinnedChats = chats.filter((c) => c.pinned);
  const totalMessages = chats.reduce((sum, c) => sum + c.messages.length, 0);
  const usagePct = Math.round(
    (user.usage.tokensUsed / user.usage.tokensLimit) * 100,
  );

  const stats = [
    {
      label: "Total Chats",
      value: chats.length,
      icon: MessageSquare,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Messages Sent",
      value: totalMessages,
      icon: Zap,
      color: "text-purple-600 bg-purple-100",
    },
    {
      label: "This Week",
      value: "3 chats",
      icon: Clock,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "Tokens Used",
      value: `${Math.round(user.usage.tokensUsed / 1000)}k`,
      icon: TrendingUp,
      color: "text-orange-600 bg-orange-100",
    },
  ];

  const openChat = (id) => {
    setActiveChatId(id);
    navigate("/");
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Dashboard" />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -right-2 top-8 w-16 h-16 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-blue-200" />
              <span className="text-blue-200 text-xs font-medium">
                Good day
              </span>
            </div>
            <h2 className="font-display font-bold text-xl">
              Welcome back, {user.name.split(" ")[0]}!
            </h2>
            <p className="text-blue-200 text-sm mt-1">
              You have {chats.length} conversations and {user.plan} plan active.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 flex items-center gap-2 bg-white text-blue-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 active:scale-95 transition-all w-fit"
            >
              Start chatting <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-blue-100 p-4"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}
              >
                <s.icon size={18} />
              </div>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Token Usage */}
        <div className="bg-white rounded-2xl border border-blue-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">
              Token Usage
            </h3>
            <span className="text-xs text-slate-500">{usagePct}% of limit</span>
          </div>
          <div className="w-full bg-blue-50 rounded-full h-2.5 mb-2">
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{(user.usage.tokensUsed / 1000).toFixed(0)}k used</span>
            <span>{(user.usage.tokensLimit / 1000).toFixed(0)}k limit</span>
          </div>
        </div>

        {/* Pinned Chats */}
        {pinnedChats.length > 0 && (
          <Section
            title="Pinned"
            icon={Pin}
            chats={pinnedChats}
            onOpen={openChat}
          />
        )}

        {/* Recent Chats */}
        <Section
          title="Recent Chats"
          icon={Clock}
          chats={recentChats}
          onOpen={openChat}
          showAll={() => navigate("/history")}
        />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, chats, onOpen, showAll }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-blue-500" />
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        </div>
        {showAll && (
          <button
            onClick={showAll}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight size={11} />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onOpen(chat.id)}
            className="flex items-start gap-3 bg-white hover:bg-blue-50 border border-blue-100 hover:border-blue-200 rounded-xl p-3.5 cursor-pointer transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <MessageSquare size={14} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                {chat.title}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {chat.messages.length} messages ·{" "}
                {new Date(chat.updatedAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {chat.tags?.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {chat.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ArrowRight
              size={14}
              className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0 mt-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
