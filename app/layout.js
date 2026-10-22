import "./globals.css";

export const metadata = {
  title: "Life Game — Make Your Life a Game",
  description:
    "Life Game turns your life into an RPG: complete daily quests, earn XP, level up and keep your streak alive. Free accounts — your progress follows you on any device.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
