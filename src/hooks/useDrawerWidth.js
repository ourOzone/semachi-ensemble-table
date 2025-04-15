import { useEffect, useState } from 'react';

const useDrawerWidth = () => {
  const getWidth = () => (window.innerWidth <= 560 ? '100%' : '560px'); // media large 기준

  const [drawerWidth, setDrawerWidth] = useState(getWidth);

  useEffect(() => {
    const handleResize = () => {
      setDrawerWidth(getWidth());
    };

    window.addEventListener('resize', handleResize);

    // 초기값 설정
    setDrawerWidth(getWidth());

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return drawerWidth;
};

export default useDrawerWidth;