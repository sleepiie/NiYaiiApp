import { StatusBar } from 'expo-status-bar';
import { Alert, View, Image, TouchableOpacity, StyleSheet, Text, SafeAreaView, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { useState } from 'react';
import * as imgPicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

export default function App() {
  const [imagesData, setImagesData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [speaking, setSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isThaiLanguage, setIsThaiLanguage] = useState(true);

  function TextToSpeech(text, index = currentIndex) {
    const options = {
      language: isThaiLanguage ? 'th-TH' : 'en-US',
      pitch: 1.0,
      rate: 1.0,
      onDone: () => {
        if (index < imagesData.length - 1) {
          // เลื่อนไปหน้าถัดไปและอ่านต่อ
          const nextIndex = index + 1;
          setCurrentIndex(nextIndex);
          TextToSpeech(imagesData[nextIndex]?.text, nextIndex); // อ่านหน้าถัดไป
        } else {
          // หยุดเมื่อเป็นหน้าสุดท้าย
          setSpeaking(false);
        }
      },
    };
  
    if (!speaking) {
      setSpeaking(true);
      Speech.speak(text, options);
    } else {
      setSpeaking(false);
      Speech.stop();
    }
  }
  
  
  
  
  const toggleLanguage = () => {
    setIsThaiLanguage(previousState => !previousState);
  };

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
      const newIndex = imagesData.length;
      setImagesData([...imagesData, { uri: newImage.uri, text: '' }]);
      setCurrentIndex(newIndex);
      setIsProcessing(true);
      const text = await changeImgToText(newImage);
      setImagesData(prevData => {
        const newData = [...prevData];
        newData[newIndex] = { ...newData[newIndex], text };
        return newData;
      });
      setIsProcessing(false);
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
      const newIndex = imagesData.length;
      setImagesData([...imagesData, { uri: newImage.uri, text: '' }]);
      setCurrentIndex(newIndex);
      setIsProcessing(true);
      const text = await changeImgToText(newImage);
      setImagesData(prevData => {
        const newData = [...prevData];
        newData[newIndex] = { ...newData[newIndex], text };
        return newData;
      });
      setIsProcessing(false);
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
      .then(result => result["all_text"].trim().replace(/\s+/g, ' '))
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

  const handleClear = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to clear all images and text?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "OK", 
          onPress: () => {
            setImagesData([]);
            setCurrentIndex(0);
            setSpeaking(false);
            Speech.stop();
          }
        }
      ]
    );
  };

  const handleSave = () => {
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {imagesData.length > 0 ? (
          <>
            <Image source={{ uri: imagesData[currentIndex].uri }} style={styles.image} />
            <ScrollView style={styles.scrollView}>
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.processingText}>กำลังประมวลผลข้อความ...</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 15 }}>{imagesData[currentIndex]?.text || 'ไม่พบข้อความในภาพ'}</Text>
              )}
            </ScrollView>
          </>
        ) : (
          <Text style={styles.noDataText}>No images. Please select or take a photo.</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.languageToggleContainer}>
            <Text>EN</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#4CAF50" }}
              thumbColor={isThaiLanguage ? "#ffffff" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleLanguage}
              value={isThaiLanguage}
            />
            <Text>TH</Text>
          </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handlePrevious} disabled={currentIndex === 0 || isProcessing}>
            <Text style={styles.buttonText}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { flex: 1 }]} 
            onPress={() => { imagesData[currentIndex]?.text ? TextToSpeech(imagesData[currentIndex].text) : null }}
            disabled={isProcessing || !imagesData[currentIndex]?.text}>
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

          <TouchableOpacity style={styles.button} onPress={handleNext} disabled={currentIndex === imagesData.length - 1 || isProcessing}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={pickImageCamera} disabled={isProcessing}>
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={picImageGallery} disabled={isProcessing}>
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClear} disabled={isProcessing || imagesData.length === 0}>
            <Text style={styles.buttonText}>Clear All</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={isProcessing}>
            <Text style={styles.buttonText}>Save</Text>
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
  languageToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
    marginTop: 5,
  },
  buttonContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row', 
    justifyContent: 'center',
    marginVertical: 7,
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
  clearButton: {
    backgroundColor: '#f44336',
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
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  processingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4CAF50',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});