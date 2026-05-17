import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeToggle from "./components/ThemeToggle";
import AppToaster from "./components/AppToaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SINTA Journal AI",
  description: "AI-powered journal discovery and recommendation platform",
};

export default function RootLayout({ children }) {
  const themeScript = `
    try {
      const theme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const resolvedTheme = theme === "dark" || theme === "light" ? theme : prefersDark ? "dark" : "light";

      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
      document.documentElement.style.colorScheme = resolvedTheme;
    } catch (_) {}
  `;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors">
        <ThemeProvider>
          {children}
          <ThemeToggle hideOnDashboard />
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
