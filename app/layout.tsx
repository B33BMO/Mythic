import "./globals.css";
import UserPreloader from "@/components/UserPreloader";

const isDev = typeof process !== "undefined" && process.env.NEXT_PUBLIC_ELECTRON_DEV === "1";

export const metadata = { title: "Mythic Zulip", description: "Next + Electron Zulip client" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {isDev && (
          <meta
            httpEquiv="Content-Security-Policy"
            content={[
              "default-src 'self' data: blob: filesystem: ws: http://localhost:3000 http://127.0.0.1:3000",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 http://127.0.0.1:3000",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' ws: http://localhost:3000 http://127.0.0.1:3000",
            ].join("; ")}
          />
        )}
      </head>
      <body className="h-screen w-screen overflow-hidden">
        <UserPreloader />
        {children}
      </body>
    </html>
  );
}
