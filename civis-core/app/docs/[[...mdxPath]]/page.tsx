import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props: {
    params: Promise<{ mdxPath?: string[] }>
}) {
    const params = await props.params
    const { metadata } = await importPage(params.mdxPath)
    return metadata
}

export default async function Page(props: {
    params: Promise<{ mdxPath?: string[] }>
}) {
    const params = await props.params
    const { default: MDXContent, toc, metadata, ...rest } = await importPage(
        params.mdxPath
    )

    return (
        <MDXWrapper toc={toc} metadata={metadata} {...rest}>
            <MDXContent params={params} />
        </MDXWrapper>
    )
}

function MDXWrapper(props: any) {
    const Wrapper = useMDXComponents().wrapper
    return <Wrapper {...props} />
}
