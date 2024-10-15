import { StatusBar } from 'expo-status-bar';
import { Alert, View, Image, TouchableOpacity, StyleSheet, Text, SafeAreaView, ScrollView, ActivityIndicator, Switch, TextInput, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import * as imgPicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DocumentSelectionScreen = ({ documents, onCreateNew, onSelectDocument, onDeleteDocument }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Select a Book</Text>
      <FlatList
        data={documents}
        renderItem={({ item }) => (
          <View style={styles.documentItemContainer}>
            <TouchableOpacity
              style={styles.documentItem}
              onPress={() => onSelectDocument(item)}
            >
              {item.imagesData && item.imagesData.length > 0 && (
                <Image
                  source={{ uri: item.imagesData[0].uri }}
                  style={styles.documentThumbnail}
                />
              )}
              <Text style={styles.documentName}>{item.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDeleteDocument(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No documents found</Text>}
      />
      <TouchableOpacity style={styles.button} onPress={onCreateNew}>
        <Text style={styles.buttonText}>Create New</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};


export default function App() {
  const [imagesData, setImagesData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [speaking, setSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isThaiLanguage, setIsThaiLanguage] = useState(true);
  const [showDocumentSelection, setShowDocumentSelection] = useState(true);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const storedDocuments = await AsyncStorage.getItem('documents');
      if (storedDocuments !== null) {
        setDocuments(JSON.parse(storedDocuments));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const saveDocument = async () => {
    if (documentName.trim() === '') {
      Alert.alert('Error', 'Please enter a document name');
      return;
    }

    try {
      const newDocument = {
        id: Date.now().toString(), // Ensure this is a string
        name: documentName,
        imagesData: imagesData,
      };

      const updatedDocuments = [...documents, newDocument];
      await AsyncStorage.setItem('documents', JSON.stringify(updatedDocuments));
      setDocuments(updatedDocuments);
      setCurrentDocument(newDocument);
      setSaveModalVisible(false);
      setDocumentName('');
      Alert.alert('Success', 'Document saved successfully');
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Failed to save document');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: async () => {
            try {
              const updatedDocuments = documents.filter(doc => doc.id !== documentId);
              await AsyncStorage.setItem('documents', JSON.stringify(updatedDocuments));
              setDocuments(updatedDocuments);
              Alert.alert("Success", "Document deleted successfully");
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert("Error", "Failed to delete document");
            }
          }
        }
      ]
    );
  };

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
      selectionLimit: 10, // You can adjust this number as needed
    });
  
    if (!result.canceled && result.assets.length > 0) {
      // Immediately add new images with empty text and set processing to true
      const newImages = result.assets.map(asset => ({ uri: asset.uri, text: '' }));
      setImagesData(prevData => [...prevData, ...newImages]);
      setCurrentIndex(imagesData.length); // Set to the first new image
      setIsProcessing(true);
  
      // Process images one by one
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const text = await changeImgToText(asset);
        
        // Update the specific image with the processed text
        setImagesData(prevData => {
          const newData = [...prevData];
          newData[imagesData.length + i] = { ...newData[imagesData.length + i], text };
          return newData;
        });
      }
  
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
    header.append("apikey", "SR9d3wHUWcIQRXPvCRBx0V8wQXlrfGDF");
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
    setSaveModalVisible(true);
  };

  const handleCreateNewDocument = () => {
    setImagesData([]);
    setCurrentIndex(0);
    setCurrentDocument(null);
    setShowDocumentSelection(false);
  };

  const handleSelectDocument = (document) => {
    setImagesData(document.imagesData);
    setCurrentIndex(0);
    setCurrentDocument(document);
    setShowDocumentSelection(false);
  };

  const handleBackToDocuments = () => {
    setShowDocumentSelection(true);
    setSpeaking(false);
    Speech.stop();
  };


  if (showDocumentSelection) {
    return (
      <DocumentSelectionScreen
        documents={documents}
        onCreateNew={handleCreateNewDocument}
        onSelectDocument={handleSelectDocument}
        onDeleteDocument={handleDeleteDocument}
      />
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToDocuments}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentDocument ? currentDocument.name : 'New Book'}
        </Text>
      </View>
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

          <TouchableOpacity style={[styles.button, styles.savebutton]} onPress={handleSave} disabled={isProcessing}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {saveModalVisible && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              onChangeText={setDocumentName}
              value={documentName}
              placeholder="Enter document name"
            />
            <TouchableOpacity style={styles.button} onPress={saveDocument}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setSaveModalVisible(false)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  savebutton: {
    backgroundColor: '#6096cc',
  },
  image: {
    width: 300,
    height: 250,
    resizeMode: 'contain',
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
  title: {
    paddingTop: 20,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  documentItem: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 5,
  },
  documentName: {
    fontSize: 18,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 50,  // To offset the back button and center the title
  },
  documentItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 5,
  },
  documentItem: {
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
  },

  documentThumbnail: {
    width: 50,
    height: 50,
    marginRight: 10,
    borderRadius: 5,
  },
  documentItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 5,
  },
  documentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});