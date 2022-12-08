import React from 'react';
import Map from './components/Map';
import styled from 'styled-components';
import { useStore } from './stores/RootStore';
import { observer } from 'mobx-react-lite';

const Info = styled.p`
  position: absolute;
  z-index: 100;
  top: 15px;
  left: 60px;
  background-color: black;
  color: white;
  padding: 10px;
  height: 100px;
  width: 500px;
`;

const App = () => {
  const { mapStore } = useStore();
  return (
    <>
      <Info>{`Sketch State: ${mapStore.sketchState}; Flight Denied? ${mapStore.hasIntersection}; Intersecting Area: ${mapStore.intersectionArea} Sq Km`}</Info>
      <Map />
    </>
  );
};

// Component must be mobx observed to rerender
export default observer(App);
