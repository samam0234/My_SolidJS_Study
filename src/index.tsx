if (import.meta.env.VITE_STAGE === 'basic') await import('./basic');
else await import('./main');
