import { StatusBar } from 'expo-status-bar';
import { Alert, View, Image, TouchableOpacity, StyleSheet, Text, SafeAreaView, ScrollView } from 'react-native';
import { useState } from 'react';
import * as imgPicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

export default function App() {
  const [imagesData, setImagesData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [speaking, setSpeaking] = useState(false);

  function TextToSpeech(text) {
    const options = {
        language: 'th-TH',
        pitch: 1.0,
        rate: 1.0,
    };
  
    if (!speaking) {
        setSpeaking(true);
        Speech.speak(text, options);
    } else {
        setSpeaking(false);
        Speech.stop();
    }
  }

  const picImageGallery = async () => {
    await imgPicker.getMediaLibraryPermissionsAsync();
    let result = await imgPicker.launchImageLibraryAsync({
      mediaTypes: imgPicker.MediaTypeOptions.All,
      allowsEditing: false,
      base64: true,
      allowsMultipleSelection: true, 
    });

    if (!result.canceled) {
      const newImage = result.assets[0];
      const text = await changeImgToText(newImage); 
      setImagesData([...imagesData, { uri: newImage.uri, text }]); 
      setCurrentIndex(imagesData.length); 
    }
  };

  const pickImageCamera = async () => {
    const permissionResult = await imgPicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert("Permission to access camera is required!");
      return;
    }

    let result = await imgPicker.launchCameraAsync({
      mediaTypes: imgPicker.MediaTypeOptions.All,
      allowsEditing: true,
      base64: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newImage = result.assets[0];
      const text = await changeImgToText(newImage); 
      setImagesData([...imagesData, { uri: newImage.uri, text }]); 
      setCurrentIndex(imagesData.length);
    }
  }

  const changeImgToText = async (image) => {
    let header = new Headers();
    header.append("apikey", "H52Et2kPSs53BjYGWaLmlVLMuURyiH4C");
    header.append("Content-Type", "multipart/form-data");

    let requestOption = {
      method: 'POST',
      redirect: 'follow',
      headers: header,
      body: image,
    };

    return await fetch("https://api.apilayer.com/image_to_text/upload", requestOption)
      .then(response => response.json())
      .then(result => result["all_text"])
      .catch(error => {
        console.error('Error:', error);
        return '';
      });
  };

  const handleNext = () => {
    if (currentIndex < imagesData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {imagesData.length > 0 ? (
          <Image source={{ uri: imagesData[currentIndex].uri }} style={styles.image} />
        ) : null}
        {imagesData.length > 0 ? (
          <ScrollView style={styles.scrollView}>
            <Text style={{ fontSize: 15 }}>{imagesData[currentIndex]?.text}</Text>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handlePrevious} disabled={currentIndex === 0}>
            <Text style={styles.buttonText}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { flex: 1 }]} 
            onPress={() => { imagesData[currentIndex]?.text ? TextToSpeech(imagesData[currentIndex].text) : null }}>
            {imagesData[currentIndex]?.text ? (
              speaking ? (
                <Text style={styles.buttonText}>Stop</Text>
              ) : (
                <Text style={styles.buttonText}>Listen [Page{currentIndex+1} / {imagesData.length}]</Text>
              )
            ) : (
              <Text style={styles.buttonText}>Select a photo</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleNext} disabled={currentIndex === imagesData.length - 1}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={pickImageCamera}>
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={picImageGallery}>
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row', 
    justifyContent: 'center',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 12,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
  },
  image: {
    width: 300,
    height: 250,
    borderRadius: 15,
    margin: 20,
  },
  scrollView: {
    backgroundColor: '#e0e0e0',
    marginLeft: 10,
    marginRight: 10,
    padding: 15,
    borderRadius: 7,
    maxHeight: 280,
  },
});
