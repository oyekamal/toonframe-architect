import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { StoryboardData } from '../types';

/**
 * Convert a URL to a Blob
 */
const urlToBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  return response.blob();
};

/**
 * Convert image URL to base64
 */
const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return '';
  }
};

/**
 * Download all generated images as a ZIP file
 */
export const downloadImagesAsZip = async (storyboard: StoryboardData, characterImage: string | null): Promise<void> => {
  const zip = new JSZip();
  const imageFolder = zip.folder("storyboard-images");
  
  if (!imageFolder) {
    throw new Error('Failed to create ZIP folder');
  }

  try {
    // Add character reference images
    if (characterImage) {
      try {
        const charBlob = await urlToBlob(characterImage);
        imageFolder.file("character-main.png", charBlob);
      } catch (error) {
        console.error('Failed to add character image to ZIP:', error);
      }
    }

    // Add character reference sheet if available
    if (storyboard.characterReferenceSheet) {
      const refSheet = storyboard.characterReferenceSheet;
      const referenceFolder = imageFolder.folder("character-references");
      
      if (referenceFolder) {
        if (refSheet.front) {
          try {
            const frontBlob = await urlToBlob(refSheet.front);
            referenceFolder.file("character-front-view.png", frontBlob);
          } catch (error) {
            console.error('Failed to add front view to ZIP:', error);
          }
        }
        
        if (refSheet.side) {
          try {
            const sideBlob = await urlToBlob(refSheet.side);
            referenceFolder.file("character-side-view.png", sideBlob);
          } catch (error) {
            console.error('Failed to add side view to ZIP:', error);
          }
        }
        
        if (refSheet.back) {
          try {
            const backBlob = await urlToBlob(refSheet.back);
            referenceFolder.file("character-back-view.png", backBlob);
          } catch (error) {
            console.error('Failed to add back view to ZIP:', error);
          }
        }
      }
    }

    // Add a README file
    const readmeContent = `ToonFrame Storyboard Images
Generated on: ${new Date().toLocaleString()}

Character Description: ${storyboard.consistencyBible.characterVisuals}
Environment Description: ${storyboard.consistencyBible.environmentVisuals}

This archive contains all generated storyboard images.
Each scene has two images (A and B) showing the sequence progression.

SCENE DETAILS:
${storyboard.scenes.map(scene => `
Scene ${scene.id}: ${scene.title}
Context: ${scene.context}
Character Direction: ${scene.characterDirection || 'unspecified'}
Expression: ${scene.characterExpression || 'neutral'}
Pose: ${scene.characterPose || 'standing'}
Motion Prompt: ${scene.motionPrompt}
---`).join('')}

FILES INCLUDED:
- character-main.png (if available) - Main character reference
- character-references/ - Character reference sheet folder
  - character-front-view.png - Front facing view
  - character-side-view.png - Side profile view  
  - character-back-view.png - Back view
- Scene_XX_A.png - Start frame for each scene
- Scene_XX_B.png - End frame for each scene
- storyboard-data.json - Complete storyboard data
- motion-prompts.txt - Detailed motion descriptions
- consistency-guide.txt - Character consistency information
`;
    
    imageFolder.file("README.txt", readmeContent);

    // Add complete JSON data file
    const jsonData = {
      generated: new Date().toISOString(),
      consistencyBible: storyboard.consistencyBible,
      scenes: storyboard.scenes.map(scene => ({
        id: scene.id,
        title: scene.title,
        context: scene.context,
        imageADescription: scene.imageADescription,
        imageBDescription: scene.imageBDescription,
        motionPrompt: scene.motionPrompt,
        characterDirection: scene.characterDirection,
        characterExpression: scene.characterExpression,
        characterPose: scene.characterPose,
        hasImageA: !!scene.imageAUrl,
        hasImageB: !!scene.imageBUrl
      }))
    };
    
    imageFolder.file("storyboard-data.json", JSON.stringify(jsonData, null, 2));

    // Add motion prompts file for easy reading
    const motionPromptsContent = `ToonFrame Motion Prompts
Generated on: ${new Date().toLocaleString()}

These detailed motion prompts describe the step-by-step movement from Start Frame (A) to End Frame (B) for each scene.

${storyboard.scenes.map(scene => `
================================================================================
SCENE ${scene.id}: ${scene.title.toUpperCase()}
================================================================================

Context: ${scene.context}

Character State:
- Direction: ${scene.characterDirection || 'unspecified'}  
- Expression: ${scene.characterExpression || 'neutral'}
- Pose: ${scene.characterPose || 'standing'}

START FRAME DESCRIPTION:
${scene.imageADescription}

END FRAME DESCRIPTION:
${scene.imageBDescription}

DETAILED MOTION PROMPT:
${scene.motionPrompt}

`).join('')}`;

    imageFolder.file("motion-prompts.txt", motionPromptsContent);

    // Add character consistency guide
    const consistencyGuideContent = `Character Consistency Guide
Generated on: ${new Date().toLocaleString()}

This guide ensures character consistency across all scenes in the storyboard.

CHARACTER DESCRIPTION:
${storyboard.consistencyBible.characterVisuals}

ENVIRONMENT DESCRIPTION:
${storyboard.consistencyBible.environmentVisuals}

SCENE-BY-SCENE CONSISTENCY TRACKING:
${storyboard.scenes.map((scene, index) => {
      const prevScene = index > 0 ? storyboard.scenes[index - 1] : null;
      const directionChange = prevScene && prevScene.characterDirection !== scene.characterDirection;
      
      return `
Scene ${scene.id} - ${scene.title}:
  Direction: ${scene.characterDirection || 'unspecified'} ${directionChange ? `(CHANGED from ${prevScene?.characterDirection})` : ''}
  Expression: ${scene.characterExpression || 'neutral'}
  Pose: ${scene.characterPose || 'standing'}
  ${directionChange ? '  ⚠️  WARNING: Direction change detected - ensure smooth transition' : ''}`;
    }).join('')}

ANIMATION NOTES:
- Maintain consistent character proportions across all frames
- Pay attention to direction changes and ensure logical transitions
- Keep character clothing, colors, and features consistent
- Environment lighting should remain consistent unless story requires change
`;

    imageFolder.file("consistency-guide.txt", consistencyGuideContent);

    // Process each scene's images
    for (const scene of storyboard.scenes) {
      // Add Image A if it exists
      if (scene.imageAUrl) {
        try {
          const imageABlob = await urlToBlob(scene.imageAUrl);
          const fileName = `Scene_${scene.id.toString().padStart(2, '0')}_A.png`;
          imageFolder.file(fileName, imageABlob);
        } catch (error) {
          console.error(`Failed to add image A for scene ${scene.id}:`, error);
        }
      }

      // Add Image B if it exists
      if (scene.imageBUrl) {
        try {
          const imageBBlob = await urlToBlob(scene.imageBUrl);
          const fileName = `Scene_${scene.id.toString().padStart(2, '0')}_B.png`;
          imageFolder.file(fileName, imageBBlob);
        } catch (error) {
          console.error(`Failed to add image B for scene ${scene.id}:`, error);
        }
      }
    }

    // Generate and download the ZIP
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `toonframe-storyboard-images-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error('Failed to create ZIP file');
  }
};

/**
 * Generate and download a comprehensive PDF report
 */
export const downloadStoryboardAsPDF = async (storyboard: StoryboardData, characterImage: string | null): Promise<void> => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Helper function to check if we need a new page
    const checkNewPage = (neededHeight: number) => {
      if (yPosition + neededHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Helper function to add wrapped text
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return lines.length * fontSize * 0.353; // Convert pt to mm
    };

    // Title page
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ToonFrame Storyboard', pageWidth / 2, 40, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 55, { align: 'center' });

    yPosition = 80;

    // Add character image
    if (characterImage) {
      try {
        checkNewPage(60);
        const imageBase64 = await urlToBase64(characterImage);
        if (imageBase64) {
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Main Character', margin, yPosition);
          yPosition += 10;
          const imgWidth = 80;
          const imgHeight = 80;
          pdf.addImage(imageBase64, 'PNG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
        }
      } catch (error) {
        console.error('Failed to add character image to PDF:', error);
      }
    }

    // Add character reference sheet
    if (storyboard.characterReferenceSheet) {
      const refSheet = storyboard.characterReferenceSheet;
      
      checkNewPage(100);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Character Reference Sheet', margin, yPosition);
      yPosition += 15;
      
      const views = [
        { name: 'Front View', image: refSheet.front },
        { name: 'Side View', image: refSheet.side },
        { name: 'Back View', image: refSheet.back }
      ];
      
      let viewsInRow = 0;
      let rowStartY = yPosition;
      
      for (const view of views) {
        if (view.image) {
          try {
            const imageBase64 = await urlToBase64(view.image);
            if (imageBase64) {
              const imgWidth = 50;
              const imgHeight = 50;
              const xPos = margin + (viewsInRow * (imgWidth + 10));
              
              // Add view label
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'bold');
              pdf.text(view.name, xPos, rowStartY);
              
              // Add image
              pdf.addImage(imageBase64, 'PNG', xPos, rowStartY + 5, imgWidth, imgHeight);
              
              viewsInRow++;
              
              // Start new row after 3 images
              if (viewsInRow >= 3) {
                viewsInRow = 0;
                rowStartY += 65;
                yPosition = rowStartY;
              }
            }
          } catch (error) {
            console.error(`Failed to add ${view.name} to PDF:`, error);
          }
        }
      }
      
      // Update yPosition if we have remaining images in the row
      if (viewsInRow > 0) {
        yPosition = rowStartY + 65;
      }
      
      yPosition += 10;
    }

    // Consistency Bible Section
    checkNewPage(30);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Consistency Bible', margin, yPosition);
    yPosition += 15;

    // Character Visuals
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Character Description:', margin, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    const characterHeight = addWrappedText(
      storyboard.consistencyBible.characterVisuals,
      margin,
      yPosition,
      pageWidth - 2 * margin,
      10
    );
    yPosition += characterHeight + 10;

    checkNewPage(30);

    // Environment Visuals
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Environment Description:', margin, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    const environmentHeight = addWrappedText(
      storyboard.consistencyBible.environmentVisuals,
      margin,
      yPosition,
      pageWidth - 2 * margin,
      10
    );
    yPosition += environmentHeight + 10;

    checkNewPage(30);

    // Movement Prompts - This is now per-scene
    // pdf.setFontSize(14);
    // pdf.setFont('helvetica', 'bold');
    // pdf.text('Movement Prompts:', margin, yPosition);
    // yPosition += 8;
    
    // pdf.setFont('helvetica', 'normal');
    // const movementHeight = addWrappedText(
    //   storyboard.consistencyBible.movementPrompts,
    //   margin,
    //   yPosition,
    //   pageWidth - 2 * margin,
    //   10
    // );
    // yPosition += movementHeight + 20;

    // Scenes Section
    for (const scene of storyboard.scenes) {
      checkNewPage(80);

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Scene ${scene.id}: ${scene.title}`, margin, yPosition);
      yPosition += 15;

      // Scene Context
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Scene Context:', margin, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      const sceneDescHeight = addWrappedText(
        scene.context,
        margin,
        yPosition,
        pageWidth - 2 * margin,
        10
      );
      yPosition += sceneDescHeight + 8;

      // Image A Description
      pdf.setFont('helvetica', 'bold');
      pdf.text('Image A Description:', margin, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      const imageADescHeight = addWrappedText(
        scene.imageADescription,
        margin,
        yPosition,
        pageWidth - 2 * margin,
        10
      );
      yPosition += imageADescHeight + 8;

      // Add Image A if available
      if (scene.imageAUrl) {
        try {
          checkNewPage(60);
          const imageBase64 = await urlToBase64(scene.imageAUrl);
          if (imageBase64) {
            const imgWidth = 80;
            const imgHeight = 60;
            pdf.addImage(imageBase64, 'PNG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
          }
        } catch (error) {
          console.error(`Failed to add image A for scene ${scene.id} to PDF:`, error);
        }
      }

      // Image B Description
      checkNewPage(30);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Image B Description:', margin, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      const imageBDescHeight = addWrappedText(
        scene.imageBDescription,
        margin,
        yPosition,
        pageWidth - 2 * margin,
        10
      );
      yPosition += imageBDescHeight + 8;

      // Add Image B if available
      if (scene.imageBUrl) {
        try {
          checkNewPage(60);
          const imageBase64 = await urlToBase64(scene.imageBUrl);
          if (imageBase64) {
            const imgWidth = 80;
            const imgHeight = 60;
            pdf.addImage(imageBase64, 'PNG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
          }
        } catch (error) {
          console.error(`Failed to add image B for scene ${scene.id} to PDF:`, error);
        }
      }

      // Character Consistency Data
      checkNewPage(30);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Character Consistency:', margin, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Direction: ${scene.characterDirection || 'unspecified'}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Expression: ${scene.characterExpression || 'neutral'}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Pose: ${scene.characterPose || 'standing'}`, margin, yPosition);
      yPosition += 10;

      // Motion Prompt (Enhanced)
      checkNewPage(30);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Detailed Motion Prompt (Start → End Frame):', margin, yPosition);
      yPosition += 8;
      
      pdf.setFont('helvetica', 'normal');
      const motionPromptHeight = addWrappedText(
        scene.motionPrompt,
        margin,
        yPosition,
        pageWidth - 2 * margin,
        10
      );
      yPosition += motionPromptHeight + 20;
    }

    // Save the PDF
    pdf.save(`toonframe-storyboard-${Date.now()}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

/**
 * Check if all images are generated for download
 */
export const areAllImagesGenerated = (storyboard: StoryboardData): boolean => {
  return storyboard.scenes.every(scene => scene.imageAUrl && scene.imageBUrl);
};

/**
 * Get the count of generated images
 */
export const getGeneratedImagesCount = (storyboard: StoryboardData): { total: number; generated: number } => {
  const total = storyboard.scenes.length * 2;
  const generated = storyboard.scenes.reduce((count, scene) => {
    return count + (scene.imageAUrl ? 1 : 0) + (scene.imageBUrl ? 1 : 0);
  }, 0);
  
  return { total, generated };
};