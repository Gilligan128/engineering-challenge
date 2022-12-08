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
  @media (max-width: 500px) {}
  opacity: .8;
  border-radius: 1em;
`;

const App = () => {
  const { mapStore } = useStore();
  return (
    <>
      <Info>
        <div>Sketch State: {mapStore.sketchState}</div>
        <div>Flight Allowed? {mapStore.hasIntersection === true ? 'No' : 'Yes'}</div>
        <div>Intersecting Area: {mapStore.intersectionArea.toFixed(2)} Sq Km</div>
      </Info>
     
     <Map />
    </>
  );
};

// Component must be mobx observed to rerender
export default observer(App);
