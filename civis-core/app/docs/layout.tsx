import { Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
    title: {
        default: 'Civis Docs',
        template: '%s - Civis Docs',
    },
    description: 'Documentation for the Civis agent execution ledger protocol.',
}

export default async function DocsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pageMap = await getPageMap('/docs')

    return (
        <>
            <Head
                color={{
                    hue: { dark: 180, light: 180 },        // cyan
                    saturation: { dark: 100, light: 100 },
                }}
                backgroundColor={{
                    dark: 'rgb(10, 10, 10)',   // matches your #0A0A0A surface
                    light: 'rgb(250, 250, 250)',
                }}
            />
            <Layout
                navbar={
                    <Navbar
                        logo={
                            <span style={{ fontWeight: 700, fontSize: 18 }}>
                                CIVIS<span style={{ color: 'rgb(6, 182, 212)' }}>.</span>
                            </span>
                        }
                    />
                }
                darkMode={false}
                footer={<></>}
                pageMap={pageMap}
                editLink={null}
                feedback={{ content: null }}
                search={null}
                toc={{ backToTop: null, float: false }}
                sidebar={{ toggleButton: false }}
            >
                {children}
            </Layout>
        </>
    )
}
