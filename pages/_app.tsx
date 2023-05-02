import type { AppProps } from "next/app";
import "../src/globals.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
const address = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = new ConvexReactClient(address);

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ConvexProvider client={convex}>
      <Component {...pageProps} />
    </ConvexProvider>
  );
}
