import ChatWindow from '@/components/ChatWindow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search — OSearch',
  description: 'Ask the web. Get cited answers with OSearch.',
};

const Home = () => {
  return <ChatWindow />;
};

export default Home;
