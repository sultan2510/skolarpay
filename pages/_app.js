// pages/_app.js
import Head from 'next/head'; 
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Mobile viewport — critical for Vercel/mobile view layouts */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0F0E1A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>SkolarPay</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}