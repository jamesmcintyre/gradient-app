/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableWithoutFeedback
} from 'react-native';
import Camera from 'react-native-camera';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import WS from 'react-native-websocket'
import { BlurView, VibrancyView } from 'react-native-blur';

export default class ShopperApp extends Component {
  constructor() {
    super();
    this.state = {capturing: false, result: 'tap to begin...'};
    this.takePicture = this.takePicture.bind(this);
    this.onBarCodeDetected = this.onBarCodeDetected.bind(this);
    this.onFocusEvent = this.onFocusEvent.bind(this);
    this.captureFrames = this.captureFrames.bind(this);
    this.toggleCapture = this.toggleCapture.bind(this);
    this.base64Image = this.base64Image.bind(this);
    this.wsMessage = this.wsMessage.bind(this);
    this.sendFrame = this.sendFrame.bind(this);
  }
  captureFrames(init) {
    console.log('captureFrames ran');
    console.log('capturing: ', this.state.capturing);
    if (this.state.capturing || init) {
      this.takePicture();
      setTimeout(this.captureFrames, 1000);
    }
  }
  toggleCapture() {
    this.setState({capturing: !this.state.capturing});
    this.captureFrames(!this.state.capturing);
  }
  takePicture() {
    const options = {};
    //options.location = ...
    console.log('picture taken!');
    this.camera.capture({metadata: options})
      .then((data) => {
        console.log('pic taken:', data);
        if (data.path !== 'undefined') this.compressImage(data.path);
      })
      .catch(err => console.error(err));
  }
  compressImage(imagePath) {
    ImageResizer.createResizedImage(imagePath, 80, 1000, 'JPEG', 10).then((response) => {
      // response.uri is the URI of the new image that can now be displayed, uploaded...
      // response.path is the path of the new image
      // response.name is the name of the new image with the extension
      // response.size is the size of the new image
      console.log('image resized: ', response);
      this.base64Image(response);
    }).catch((err) => {
      console.log('image resize error: ', err);
      // Oops, something went wrong. Check that the filename is correct and
      // inspect err to get more details.
    });
  }
  base64Image(imgPath) {
    let imgBase64Data;
    RNFS.stat(imgPath)
      .then((statResult) => {
        console.log('compressed image stat:', statResult);
        return;
      })
      .then(() => {
        RNFS.readFile(imgPath, 'base64')
        .then((imgData) => {
          // imgBase64Data = imgData;
          // console.log('base64 image data: ', imgBase64Data);
          this.sendFrame(imgData)
        })
      })
      .catch((err) => console.log('base64Error: ', err))
  }
  onBarCodeDetected(data, bounds) {
    console.log('barcode detected!: ', data);
    console.log('barcode bounds: ', bounds);
  }
  onFocusEvent(event) {
    console.log('focus event!: ', event);
  }
  wsMessage(message) {
    console.log(message);
    const wsFrameData = JSON.parse(message.data);
    if (typeof wsFrameData.results !== 'undefined') {
      console.log('\n\nhighest result: ', wsFrameData.results[0].name);
      this.setState({result: wsFrameData.results[0]});
    }

  }
  sendFrame(base64Data) {
    this.ws.send(JSON.stringify({
      ts: new Date().toTimeString(),
      img: base64Data
    }));
  }
  render() {
    // setTimeout(this.captureFrames, 500)
    const blurType = this.state.capturing ? "dark" : "light";
    const { result } = this.state;
    const displayResult = (result === 'tap to begin...') ? result : result.name + ' score: ' + result.score;
    return (
      <View style={styles.container}>
        <WS
          ref={ref => {this.ws = ref}}
          url="ws://10.0.0.188:3001/"
          onOpen={() => {
            console.log('Open!')
            this.ws.send(JSON.stringify({message: 'Hello'}))
          }}
          onMessage={(message) => this.wsMessage(message)}
          onError={console.log}
          onClose={console.log}
          reconnect // Will try to reconnect onClose
        />
        <Camera
          ref={(cam) => {
            this.camera = cam;
          }}
          style={styles.preview}
          aspect={Camera.constants.Aspect.fill}
          captureTarget={Camera.constants.CaptureTarget.disk}
          onBarCodeRead={this.onBarCodeDetected}
          defaultOnFocusComponent={true}
          defaultOnFocusComponent={false}>
        </Camera>
        <TouchableWithoutFeedback
          onPress={this.toggleCapture}>
          <BlurView
            style={styles.absolute}
            blurType={blurType}
            blurAmount={10}>
            <Text style={styles.result}>{displayResult}</Text>
          </BlurView>
        </TouchableWithoutFeedback>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row'
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  capture: {
    position: 'relative',
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    color: '#000',
    padding: 10,
    margin: 40,
    zIndex: 4
  },
  result: {
    position: 'relative',
    flex: 0,
    fontSize: 20,
    backgroundColor: 'rgba(52, 52, 52, 0.0)',
    color: '#fff',
    padding: 10,
    margin: 20,
    zIndex: 4
  },
  absolute: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: "absolute",
    zIndex: 1,
    top: '85%', left: 0, bottom: 0, right: 0,

  }
});

AppRegistry.registerComponent('ShopperApp', () => ShopperApp);
