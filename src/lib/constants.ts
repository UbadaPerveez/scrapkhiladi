export const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: string; emoji: string }
> = {
  recycle: {
    label: "Recycle",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: "Recycle",
    emoji: "♻️",
  },
  donate: {
    label: "Donate",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: "Heart",
    emoji: "🤝",
  },
  trash: {
    label: "Trash",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-300",
    icon: "Trash2",
    emoji: "🗑️",
  },
  hazardous: {
    label: "Hazardous",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: "AlertTriangle",
    emoji: "⚠️",
  },
};

export const MAP_QUERY_MAP: Record<string, string> = {
  recycle: "recycling center",
  donate: "thrift store donation center",
  hazardous: "hazardous waste disposal facility",
};
