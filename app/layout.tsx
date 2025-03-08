import { Navbar } from "@/components/navbar";
import { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Bell, Grid, LayoutGrid, Calendar } from "lucide-react"
import Link from "next/link"
import type React from "react"
import { History } from "@/components/history";
import { auth, signOut } from "@/app/(auth)/auth";
// import { usePathname } from "next/navigation"
import { BotIcon, AttachmentIcon } from "@/components/icons";


interface NavItemProps {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  active?: boolean
}


function NavItem({ href, icon, children, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
        active 
          ? "bg-gray-100 text-gray-900 font-medium" 
          : "text-gray-700 hover:bg-gray-50"
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}





export const metadata: Metadata = {
  metadataBase: new URL(
    "https://ai-sdk-preview-internal-knowledge-base.vercel.app",
  ),
  title: "Internal Knowledge Base",
  description:
    "Internal Knowledge Base using Retrieval Augmented Generation and Middleware",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = await auth();

  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-white dark:bg-zinc-900">
          {/* Sidebar - hide on mobile, show on desktop when logged in */}
          {session ? (
            <div className="hidden md:fixed md:top-0 md:left-0 md:w-64 md:h-full md:border-r md:bg-white md:dark:bg-zinc-900 md:z-20">
              <div className="flex flex-row gap-3 items-center p-4 border-b">
                <History />
                <h1 className="text-xl font-bold">Query Desk</h1>
              </div>
              <nav className="space-y-1 px-2 pt-4">
                <NavItem 
                  href="/" 
                  // icon={<LayoutGrid className="h-4 w-4" />}
                  icon={<BotIcon />}
                  // active={pathname === "/chat"}
                >
                  AI Assistant
                </NavItem>
                {session.user?.role === "admin" && (
                <NavItem
                  href="/documents"
                  icon={<AttachmentIcon />}
                  // active={pathname === "/documents"}
                >
                  Documents
                </NavItem>
                )}
                <NavItem
                  href="/calendar"
                  icon={<Calendar size={17} />}
                >
                  Calendar
                </NavItem>
                {session.user?.role === "admin" && (
                <NavItem
                  href="/settings"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6m-3 4v6m-3-3h6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  // active={pathname === "/settings"}
                >
                  Settings
                </NavItem>
                )}
              </nav>
            </div>
          ) : null}

          {/* Main content - adjust padding/margin based on screen size */}
          <div className={`flex-1 ${session ? 'md:ml-64' : ''}`}>
            {/* Header - full width on mobile, adjusted on desktop */}
            <header className={`flex items-center justify-between fixed top-0 right-0 left-0 bg-white dark:bg-zinc-900 border-b px-4 py-3 z-10 ${session ? 'md:left-64' : ''}`}>
              {/* Show menu/logo on mobile when logged in */}
              {session ? (
                <div className="flex md:hidden items-center gap-3">
                  <History />
                  <span className="text-lg font-semibold">Query Desk</span>
                </div>
              ) : (
                <span className="text-lg font-semibold">Query Desk</span>
              )}
              
              <div className="flex items-center gap-4">
                {session ? (
                  <div className="group relative">
                    <div className="text-sm dark:text-zinc-400 px-3 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      {session.user?.email}
                    </div>
                    <div className="absolute right-0 top-full mt-1 w-full pt-2 hidden group-hover:block">
                      <form
                        action={async () => {
                          "use server";
                          await signOut();
                        }}
                      >
                        <button
                          type="submit"
                          className="w-full text-sm p-2 rounded-md bg-red-500 text-white hover:bg-red-600"
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="text-sm px-3 py-1.5 bg-zinc-900 rounded-md text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Login
                  </Link>
                )}
              </div>
            </header>

            {/* Main content - add padding for header */}
            <main className="pt-16"> {/* Adjust based on header height */}
              <Toaster position="top-center" />
              {/* <Navbar /> */}
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
