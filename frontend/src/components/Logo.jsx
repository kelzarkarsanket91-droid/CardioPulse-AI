export default function Logo({ size = 40, className = "" }) {
  return (
    <img
      src="/logo.jpeg"
      alt="CardioPulse Ai logo"
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
