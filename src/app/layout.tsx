import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className="bg-gray-50 text-gray-900">
        <Providers>
            <Navbar />
            <main className="p-6">{children}</main>
        </Providers>
        </body>
        </html>
    );
}
