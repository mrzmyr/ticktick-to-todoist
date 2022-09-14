import posthog from 'posthog-js';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    posthog.init('phc_MbgwrTpHMaEQMRR5Eo1JME6RD9sf2yA2iPyV94U6esd', { api_host: 'https://app.posthog.com' });

    const handleRouteChange = () => posthog.capture('$pageview');
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, []);

  return <Component {...pageProps} />
}

export default MyApp
