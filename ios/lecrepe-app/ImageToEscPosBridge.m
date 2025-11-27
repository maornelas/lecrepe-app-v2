#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>

@interface RCT_EXTERN_MODULE(ImageToEscPos, NSObject)

RCT_EXTERN_METHOD(convertImageToEscPos:(NSString *)imagePath
                  printerWidth:(NSInteger)printerWidth
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

