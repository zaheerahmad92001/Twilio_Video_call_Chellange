import React, { useEffect, useRef, useState } from 'react';
import {
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
  TwilioVideo
} from 'react-native-twilio-video-webrtc';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Button,
  Alert,
} from 'react-native';

import {
  checkMultiple,
  request,
  requestMultiple,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

const App = (props) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [status, setStatus] = useState('disconnected');
  const [participants, setParticipants] = useState(new Map());
  const [videoTracks, setVideoTracks] = useState(new Map());
  const [token, setToken] = useState('');
  const [userName, setUserName] = useState('')
  const [roomName, setRoomName] = useState('')
  const twilioRef = useRef(null);
  const API_URL  ='https://e1001c4bd275.ngrok.io'

  const _checkPermissions = (callback) => {
    const iosPermissions = [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE];
    const androidPermissions = [
      PERMISSIONS.ANDROID.CAMERA,
      PERMISSIONS.ANDROID.RECORD_AUDIO,
    ];
    checkMultiple(
      Platform.OS === 'ios' ? iosPermissions : androidPermissions,
    ).then((statuses) => {
      const [CAMERA, AUDIO] =
        Platform.OS === 'ios' ? iosPermissions : androidPermissions;
      if (
        statuses[CAMERA] === RESULTS.UNAVAILABLE ||
        statuses[AUDIO] === RESULTS.UNAVAILABLE
      ) {
        Alert.alert(
          'Error',
          'Hardware to support video calls is not available',
        );
      } else if (
        statuses[CAMERA] === RESULTS.BLOCKED ||
        statuses[AUDIO] === RESULTS.BLOCKED
      ) {
        Alert.alert(
          'Error',
          'Permission to access hardware was blocked, please grant manually',
        );
      } else {
        if (
          statuses[CAMERA] === RESULTS.DENIED &&
          statuses[AUDIO] === RESULTS.DENIED
        ) {
          requestMultiple(
            Platform.OS === 'ios' ? iosPermissions : androidPermissions,
          ).then((newStatuses) => {
            if (
              newStatuses[CAMERA] === RESULTS.GRANTED &&
              newStatuses[AUDIO] === RESULTS.GRANTED
            ) {
              callback && callback();
            } else {
              Alert.alert('Error', 'One of the permissions was not granted');
            }
          });
        } else if (
          statuses[CAMERA] === RESULTS.DENIED ||
          statuses[AUDIO] === RESULTS.DENIED
        ) {
          request(statuses[CAMERA] === RESULTS.DENIED ? CAMERA : AUDIO).then(
            (result) => {
              if (result === RESULTS.GRANTED) {
                callback && callback();
              } else {
                Alert.alert('Error', 'Permission not granted');
              }
            },
          );
        } else if (
          statuses[CAMERA] === RESULTS.GRANTED ||
          statuses[AUDIO] === RESULTS.GRANTED
        ) {
          callback && callback();
        }
      }
    });
  };


  useEffect(() => {
    _checkPermissions();
  }, []);

 const _onGetTokenButtonPress =()=>{
  // let url = `${API_URL}/getToken?userName=${userName}`

    fetch(`${API_URL}/getToken?userName=${userName}`)
    .then((response) => {
      if (response.ok) {
        response.text().then((jwt) => {
          console.log('token is ' , jwt)
          setToken(jwt)
          // setProps({...props, token: jwt});
          // navigation.navigate('Video Call');
          return true;
        });
      } else {
        response.text().then((error) => {
          Alert.alert(error);
        });
      }
    })
    .catch((error) => {
      console.log('error', error);
      Alert.alert('API not available');
    });

  }


  const _onConnectButtonPress = () => {
    console.log('connecting token is ', token , 'room name',  roomName)
    // twilioRef.current.connect({ accessToken: token , });
    twilioRef.current.connect({
      roomName: roomName,
      accessToken:token,
    })
   
    setStatus('connecting');
  }

  const _onEndButtonPress = () => {
    twilioRef.current.disconnect();
  };

  const _onMuteButtonPress = () => {
    twilioRef.current
      .setLocalAudioEnabled(!isAudioEnabled)
      .then(isEnabled => setIsAudioEnabled(isEnabled));
  };

  const _onFlipButtonPress = () => {
    twilioRef.current.flipCamera();
  };

  const _onRoomDidConnect = ({ roomName, error }) => {
    console.log('onRoomDidConnect: ', roomName);
    setStatus('connected');

  };

  const _onRoomDidDisconnect = ({ roomName, error }) => {
    console.log('[Disconnect]ERROR: ', error);

    setStatus('disconnected');
  };

  const _onRoomDidFailToConnect = error => {
    console.log('[FailToConnect]ERROR: ', error);

    setStatus('disconnected');
  };

  const _onParticipantAddedVideoTrack = ({ participant, track }) => {
    console.log('onParticipantAddedVideoTrack: ', participant, track);

    setVideoTracks(
      new Map([
        ...videoTracks,
        [
          track.trackSid,
          { participantSid: participant.sid, videoTrackSid: track.trackSid },
        ],
      ]),
    );
  };

  const _onParticipantRemovedVideoTrack = ({ participant, track }) => {
    console.log('onParticipantRemovedVideoTrack: ', participant, track);

    const videoTracksLocal = videoTracks;
    videoTracksLocal.delete(track.trackSid);

    setVideoTracks(videoTracksLocal);
  };

  return (
    <View style={styles.container}>
      {
        status === 'disconnected' &&
        <View style={styles.form}>
          <Text style={styles.welcome}>
            React Native Twilio Video
          </Text>
          <Text style={styles.heading}>User Name</Text>
          <TextInput
            style={styles.textInput}
            autoCapitalize='none'
            value={userName}
            onChangeText={(text) => setUserName(text)}
          // value={token}
          // onChangeText={(text) => setToken(text)}
          >
          </TextInput>
          <Text style={styles.heading}>Room Name</Text>
          <TextInput
            style={styles.textInput}
            autoCapitalize='none'
            value={roomName}
            onChangeText={(text) => setRoomName(text)}>
          </TextInput>
          <Button
            title="getToken"
            style={styles.button}
            onPress={_onGetTokenButtonPress}>
          </Button>

          <Button
            title="Connect Video Call"
            style={styles.button}
            onPress={_onConnectButtonPress}>
          </Button>
        </View>
      }

      {
        (status === 'connected' || status === 'connecting') &&
        <View style={styles.callContainer}>
          {
            status === 'connected' &&
            <View style={styles.remoteGrid}>
              {
                Array.from(videoTracks, ([trackSid, trackIdentifier]) => {
                  return (
                    <TwilioVideoParticipantView
                      style={styles.remoteVideo}
                      key={trackSid}
                      trackIdentifier={trackIdentifier}
                    />
                  )
                })
              }
            </View>
          }
          <View
            style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={_onEndButtonPress}>
              <Text style={{ fontSize: 12 }}>End</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={_onMuteButtonPress}>
              <Text style={{ fontSize: 12 }}>{isAudioEnabled ? "Mute" : "Unmute"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={_onFlipButtonPress}>
              <Text style={{ fontSize: 12 }}>Flip</Text>
            </TouchableOpacity>
            <TwilioVideoLocalView
              enabled={true}
              style={styles.localVideo}
            />
          </View>
        </View>
      }

      <TwilioVideo
        ref={twilioRef}
        onRoomDidConnect={_onRoomDidConnect}
        onRoomDidDisconnect={_onRoomDidDisconnect}
        onRoomDidFailToConnect={_onRoomDidFailToConnect}
        onParticipantAddedVideoTrack={_onParticipantAddedVideoTrack}
        onParticipantRemovedVideoTrack={_onParticipantRemovedVideoTrack}
      />
    </View>
  );
}
export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'lightgrey',
    flexDirection: 'row',
  },
  welcome: {
    margin: 20
  },
  form: {
    flex: 1,
    alignSelf: 'center',
    borderRadius: 10,
    margin: 20,
    backgroundColor: 'white',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  heading: {
    marginHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    // top: 50,
    padding: 10,
    backgroundColor:'blue',
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
  textInput: {
    padding: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'red',
    marginTop: 10,
    margin: 20,

  },
  callContainer: {
    flex: 1,
  },
  callWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  remoteGrid: {
    flex: 1,
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    position: 'absolute',
    right: 5,
    bottom: 50,
    width: 100,
    height: 100
  },
  optionsContainer: {
    position: 'absolute',
    paddingHorizontal: 10,
    left: 0,
    right: 0,
    bottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});