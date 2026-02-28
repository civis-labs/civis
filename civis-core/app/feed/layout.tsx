import { Nav } from "@/components/nav";

export default function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 lg:ml-[240px]">{children}</main>
        </div>
    );
}
