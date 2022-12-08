import { action, makeObservable, observable } from 'mobx';
import RootStore from './RootStore';
import ArcGISMap from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Sketch from '@arcgis/core/widgets/Sketch';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import { List } from 'antd';
import { withInfo } from 'antd/lib/modal/confirm';
import { Geometry } from 'geojson';

class IntersectionResult {
  intersectionArea: number = 0;
  intersections: Array<__esri.Geometry>;
  constructor(intersections: Array<__esri.Geometry>, intersectionArea: number) {
    this.intersectionArea = intersectionArea;
    this.intersections = intersections;
  }

  hasIntersection() {
    return this.intersectionArea > 0;
  }
}

export default class MapStore {
  rootStore: RootStore;
  map!: __esri.Map;
  noFlyLayer!: __esri.GraphicsLayer;
  sketchLayer!: __esri.GraphicsLayer;
  sketch!: __esri.Sketch;
  sketchState!: string;
  hasIntersection: boolean = false;
  intersectionArea: number = 0;

  constructor(rootStore: RootStore) {
    // HINT: you can add additional observable properties to this class
    // https://mobx.js.org/observable-state.html
    makeObservable(this, { sketchState: observable, hasIntersection: observable, intersectionArea: observable, setSketchState: action, setHasIntersection: action, setIntersectionArea: action });
    this.rootStore = rootStore;
    this.setSketchState('idle');
  }

  setSketchState(state: string) {
    this.sketchState = state;
  }

  setHasIntersection(state: boolean) {
    this.hasIntersection = state;
  }

  setIntersectionArea(state: number) {
    this.intersectionArea = state;
  }

  constructMap(container: string) {
    this.sketchLayer = new GraphicsLayer();
    this.noFlyLayer = new GraphicsLayer();

    // Define a symbol
    // https://developers.arcgis.com/javascript/latest/api-reference/esri-symbols-SimpleFillSymbol.html
    const symbol = {
      type: 'simple-fill',
      color: [51, 51, 204, 0.2],
      style: 'solid',
      outline: {
        color: 'white',
        width: 2,
      },
    };

    // Construct map graphic
    // https://developers.arcgis.com/javascript/latest/api-reference/esri-Graphic.html
    this.noFlyLayer.add(
      new Graphic({
        geometry: new Polygon({
          spatialReference: { wkid: 102100 },
          rings: [
            [
              [-9278977.502393615, 5196972.662366206],
              [-9278404.224681476, 5197240.191965203],
              [-9274505.936238931, 5195673.232885358],
              [-9275518.726863708, 5190055.1113064],
              [-9278881.956108259, 5189061.429938688],
              [-9280869.318843672, 5188660.135540191],
              [-9282646.479751302, 5192481.986954449],
              [-9278977.502393615, 5196972.662366206],
            ],
          ],
        }),
        symbol,
      })
    );

    // Create the map and add the graphics layer
    // https://developers.arcgis.com/javascript/latest/api-reference/esri-Map.html
    this.map = new ArcGISMap({
      basemap: 'streets-vector',
      layers: [this.noFlyLayer, this.sketchLayer],
    });

    // Set the map view, including location and zoom level
    // https://developers.arcgis.com/javascript/latest/api-reference/esri-views-MapView.html
    const view = new MapView({
      map: this.map,
      container,
      center: [-83.35447311401367, 42.23982914405], // Longitude, latitude
      zoom: 11,
    });

    // When the view finishes loading, add the sketch widget
    // https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Sketch.html
    view.when(() => {
      this.sketch = new Sketch({
        layer: this.sketchLayer,
        view,
        visibleElements: {
          createTools: { point: false, polygon: false, polyline: false },
          selectionTools: { 'lasso-selection': false, 'rectangle-selection': false },
          settingsMenu: false,
          undoRedoMenu: false,
        },
        creationMode: 'update', // graphic will be selected as soon as it is created
      });
      view.ui.add(this.sketch, 'top-right');

      this.sketch.on('create', this.sketchCreate);
      this.sketch.on('update', this.sketchUpdate);
    });
  }

  sketchCreate = async (event: __esri.SketchCreateEvent) => {
    this.setSketchState(event.state);
    if (event.state !== 'complete') return;
    
    const sketchedGeometry = event.graphic.geometry

    //Instead of getting one geometry, since we have a list, I would rather push funcitonality into the list rather than assume the list will always only have one item
    const noFlyGeometries = this.noFlyLayer.graphics
                                .map(graphic => graphic.geometry)
    const intersectionResult = this.calculateInterections(sketchedGeometry, noFlyGeometries)

    const intersectionGraphics = intersectionResult.intersections.map (intersection => new Graphic({
                                    geometry: intersection,
                                    symbol: {
                                      color: "blue"
                                    }
                                  }));
    
    this.sketchLayer.removeAll();     
    this.sketchLayer.add(event.graphic);
    this.sketchLayer.addMany(intersectionGraphics);                        
    // HINT: you can provide a symbol when creating this graphic to change its appearance
    // https://developers.arcgis.com/javascript/latest/sample-code/playground/live/index.html#/config=symbols/2d/SimpleFillSymbol.json

    this.setHasIntersection(intersectionResult.hasIntersection())
    this.setIntersectionArea(intersectionResult.intersectionArea)
  };

  sketchUpdate = async (event: __esri.SketchUpdateEvent) => {
    this.setSketchState(event.state);
    if (event.state !== 'complete') return;

    const sketchedGeometry = event.graphics[0].geometry; //should handle all updated geometries.

    const noFlyGeometries = this.noFlyLayer.graphics
                                .map(graphic => graphic.geometry)
    const intersectionResult = this.calculateInterections(sketchedGeometry, noFlyGeometries)

    const intersectionGraphics = intersectionResult.intersections.map (intersection => new Graphic({
                                    geometry: intersection,
                                    symbol: {
                                      color: "blue"
                                    }
                                  }));
    
    this.sketchLayer.removeAll();     
    this.sketchLayer.add(event.graphics[0]);
    this.sketchLayer.addMany(intersectionGraphics);                        
    // HINT: you can provide a symbol when creating this graphic to change its appearance
    // https://developers.arcgis.com/javascript/latest/sample-code/playground/live/index.html#/config=symbols/2d/SimpleFillSymbol.json

    this.setHasIntersection(intersectionResult.hasIntersection())
    this.setIntersectionArea(intersectionResult.intersectionArea)
  };

  cleanup() {
    // Todo, remove any listeners
    this.sketch.destroy();
    this.setSketchState('idle');
    this.setHasIntersection(false)
    this.setIntersectionArea(0)
  }

  private calculateInterections(sketchedGeometry: __esri.Geometry, noFlyGeometries : __esri.Collection<__esri.Geometry> ) {
      //Instead of getting one geometry, since we have a list, I would rather push funcitonality into the list rather than assume the list will always only have one item
    const intersections = noFlyGeometries
      .map (geometry => geometryEngine.intersect(geometry, sketchedGeometry))
      .toArray()
      .flat()
    const intersectingPolygons = intersections.filter(geometry => geometry !== null).filter(geometry => geometry.type === 'polygon')as Array<Polygon>
    const geoAreas = intersectingPolygons.map (polygon => geometryEngine.geodesicArea(polygon, 'square-kilometers'))
    const totalArea = geoAreas.reduce((sum, current) => sum + current, 0);
    const intersectionResult = new IntersectionResult(intersections, totalArea)
    return intersectionResult;
  }
}
