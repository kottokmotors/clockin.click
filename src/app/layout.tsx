import "@/css/globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import type { Metadata } from 'next'
import { Nunito } from "next/font/google";

const nunito = Nunito({
    subsets: ["latin"],
    variable: "--font-nunito",
});

export const metadata: Metadata = {
    title: 'Clockin.Click Portal',
    description: 'Portal for schools to track timekeeping',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className="font-sans antialiased">
        <Providers>
            <Navbar />
            <main >{children}</main>
        </Providers>
        </body>
        </html>
    );
}
