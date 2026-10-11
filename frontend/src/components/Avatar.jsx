export default function Avatar({ initials, size = 36 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-teal-500 text-white font-display font-semibold select-none"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={initials}
    >
      {initials || "?"}
    </div>
  );
}
