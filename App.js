import { StatusBar } from 'expo-status-bar';
import { Alert, View, Image, TouchableOpacity, StyleSheet, Text, SafeAreaView, ScrollView, ActivityIndicator, Switch,TextInput  } from 'react-native';
import { useState , useEffect } from 'react';
import * as imgPicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [imagesData, setImagesData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [speaking, setSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isThaiLanguage, setIsThaiLanguage] = useState(true);
  const [isSelectingDocument, setIsSelectingDocument] = useState(true); 
  const [newDocName, setNewDocName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [documents, setDocuments] = useState([]); // เพิ่มการตั้งค่าเริ่มต้นของ documents

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const savedDocs = await AsyncStorage.getItem('documents');
        if (savedDocs) {
          setDocuments(JSON.parse(savedDocs)); // ตั้งค่าข้อมูล documents
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };
    loadDocuments();
  }, []);
  
  const handleDocumentSelect = (doc) => {
    setImagesData(doc.imagesData);
    setIsSelectingDocument(false);
  };

  function TextToSpeech(text, index = currentIndex) {
    const options = {
      language: isThaiLanguage ? 'th-TH' : 'en-US',
      pitch: 1.0,
      rate: 1.0,
      onDone: () => {
        if (index < imagesData.length - 1) {
          const nextIndex = index + 1;
          setCurrentIndex(nextIndex);
          TextToSpeech(imagesData[nextIndex]?.text, nextIndex);
        } else {
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
  
  const saveDocument = async () => {
    if (!newDocName.trim()) {
      Alert.alert("Please enter a document name.");
      return;
    }
  
    try {
      const savedDocs = await AsyncStorage.getItem('documents');
      const parsedDocs = savedDocs ? JSON.parse(savedDocs) : [];
      
      const newDoc = {
        name: newDocName.trim(),
        imagesData,
      };
  
      parsedDocs.push(newDoc);
      await AsyncStorage.setItem('documents', JSON.stringify(parsedDocs));
      Alert.alert("Document saved successfully!");
      setNewDocName('');
      setIsSaving(false);
    } catch (error) {
      console.error("Failed to save document:", error);
      Alert.alert("Failed to save document.");
    }
  };
  
  const toggleLanguage = () => {
    setIsThaiLanguage(previousState => !previousState);
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
    header.append("apikey", "TbzsW3QztgSunes2dmiY711Llbs5XAq1");
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

  return (isSelectingDocument && documents.length > 0) ? (
    <SafeAreaView>
      <ScrollView>
        {documents.map((doc, index) => (
          <TouchableOpacity key={index} style={styles.documentButton} onPress={() => handleDocumentSelect(doc)}>
            <Text style={styles.buttonText}>{doc.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.button} onPress={() => setIsSelectingDocument(false)}>
          <Text style={styles.buttonText}>New</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  ):(
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
          <TouchableOpacity style={styles.button} onPress={handlePrevious} disabled={currentIndex === 0}>
            <Text style={styles.buttonText}>ก่อนหน้า</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleNext} disabled={currentIndex === imagesData.length - 1}>
            <Text style={styles.buttonText}>ถัดไป</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.button} onPress={() => TextToSpeech(imagesData[currentIndex]?.text)}>
          <Text style={styles.buttonText}>{speaking ? 'หยุด' : 'อ่าน'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleClear}>
          <Text style={styles.buttonText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={picImageGallery}>
          <Text style={styles.buttonText}>เลือกรูปภาพ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={pickImageCamera}>
          <Text style={styles.buttonText}>ถ่ายรูป</Text>
        </TouchableOpacity>

        {isSaving ? (
          <>
            <TextInput
              style={styles.textInput}
              placeholder="Enter document name"
              value={newDocName}
              onChangeText={setNewDocName}
            />
            <TouchableOpacity style={styles.button} onPress={saveDocument}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => setIsSaving(true)}>
            <Text style={styles.buttonText}>Save Document</Text>
          </TouchableOpacity>
        )}
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  languageToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 300,
    resizeMode: 'contain',
  },
  scrollView: {
    maxHeight: 150,
    marginVertical: 10,
  },
  noDataText: {
    fontSize: 18,
    color: 'gray',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    fontSize: 16,
    color: 'gray',
    marginTop: 10,
  },
  documentButton: {
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
});