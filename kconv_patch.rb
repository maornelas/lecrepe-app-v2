# Monkey patch para kconv en Ruby 3.4
# Este archivo debe ser requerido antes de usar CFPropertyList

unless defined?(Kconv)
  module Kconv
    # Constantes de codificación
    AUTO = 0
    EUC = 1
    SJIS = 2
    UTF8 = 3
    BINARY = 4
    ASCII = 5
    JIS = 6
    
    # Método principal para detectar codificación
    def self.guess(str)
      return BINARY if str.nil? || str.empty?
      
      # Detectar UTF-8
      if str.encoding == Encoding::UTF_8 && str.valid_encoding?
        return UTF8
      end
      
      # Detectar ASCII
      if str.ascii_only?
        return ASCII
      end
      
      # Por defecto, asumir UTF-8
      UTF8
    end
    
    # Convertir string a UTF-8
    def self.toutf8(str)
      return str if str.nil?
      str.encode(Encoding::UTF_8, invalid: :replace, undef: :replace)
    end
    
    # Convertir string a EUC-JP
    def self.toeuc(str)
      return str if str.nil?
      str.encode(Encoding::EUC_JP, invalid: :replace, undef: :replace)
    rescue Encoding::UndefinedConversionError
      str.encode(Encoding::UTF_8, invalid: :replace, undef: :replace)
    end
    
    # Convertir string a Shift_JIS
    def self.tosjis(str)
      return str if str.nil?
      str.encode(Encoding::Shift_JIS, invalid: :replace, undef: :replace)
    rescue Encoding::UndefinedConversionError
      str.encode(Encoding::UTF_8, invalid: :replace, undef: :replace)
    end
  end
end

