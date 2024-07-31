// frontend/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';

function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/your-endpoint')
      .then(response => {
        setData(response.data);
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {data && <div>{JSON.stringify(data)}</div>}
    </div>
  );
}

export default DashboardPage;
